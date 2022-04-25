const { getInput, setFailed } = require('@actions/core')
const AWS = require('aws-sdk')

async function run () {
  try {
    const repositoryName = getInput('DOCKER_REPO_NAME', { required: true })
    const daysBeforeExpiringUntaggedImages = getInput('NUM_DAYS_BEFORE_EXPIRING_UNTAGGED_IMAGES', { required: true })
    const tagPrefix = getInput('TAG_PREFIX')
    const numImages = getInput('NUM_TAGGED_IMAGES_TO_RETAIN')
    if (tagPrefix && !numImages) {
      setFailed('If TAG_PREFIX is provided, NUM_TAGGED_IMAGES_TO_RETAIN is required')
      return
    }
    if (!tagPrefix && numImages) {
      setFailed('If NUM_TAGGED_IMAGES_TO_RETAIN is provided, TAG_PREFIX is required')
      return
    }

    const ecr = new AWS.ECR({ apiVersion: '2015-09-21', region: process.env.AWS_REGION })

    let repositoryExists = false
    try {
      await ecr.describeRepositories({ repositoryNames: [repositoryName] }).promise()
      repositoryExists = true
    } catch {}

    if (repositoryExists) {
      console.log('Repository already exists 🎉')
      return
    }

    console.log('Repository does not exist. Creating...')
    await ecr.createRepository({ repositoryName, imageScanningConfiguration: { scanOnPush: true } }).promise()

    const lifecyclePolicy = {
      rules: [
        {
          rulePriority: 10,
          description: `Expire untagged images after ${daysBeforeExpiringUntaggedImages} days`,
          selection: {
            tagStatus: 'untagged',
            countType: 'sinceImagePushed',
            countUnit: 'days',
            countNumber: parseInt(daysBeforeExpiringUntaggedImages, 10)
          },
          action: {
            type: 'expire'
          }
        },
        {
          rulePriority: 20,
          description: 'Expire old images as new ones are built',
          selection: {
            tagStatus: 'tagged',
            tagPrefixList: [tagPrefix],
            countType: 'imageCountMoreThan',
            countNumber: parseInt(numImages, 10)
          },
          action: {
            type: 'expire'
          }
        },
        {
          rulePriority: 30,
          description: 'Expire `feature-`, `renovate-`, tagged images after 31 days',
          selection: {
            tagStatus: 'tagged',
            tagPrefixList: ['feature-', 'renovate-'],
            countType: 'sinceImagePushed',
            countUnit: 'days',
            countNumber: 31
          },
          action: {
            type: 'expire'
          }
        },
        {
          rulePriority: 40,
          description: 'Expire old version images as new ones are built',
          selection: {
            tagStatus: 'tagged',
            tagPrefixList: [ 'v' ],
            countType: 'imageCountMoreThan',
            countNumber: parseInt(numImages, 10)
          },
          action: {
            type: 'expire'
          }
        },
      ]
    }
    const lifecyclePolicyText = JSON.stringify(lifecyclePolicy)

    console.log('Applying repository access and lifecycle policies...')
    await Promise.all([
      ecr.putLifecyclePolicy({ repositoryName, lifecyclePolicyText }).promise()
    ])

    console.log('Done! 🎉')
  } catch (e) {
    setFailed(e.message || e)
  }
}

run()