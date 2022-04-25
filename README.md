# create-ecr-action

A Github action to create ECR repos.


## Defaults

All repos will get the following lifecycle policies attached.

1. Expire untagged images after `31` days **(can be overridden)**
2. Expire old images tagged `sha-` as new are build keeping only `10` images **(can be overridden)**
3. Expire `feature-` & `renovate-` tagged images after `31` days **(this is hard coded)**

## Usage

```yaml
on: push
# ...
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
      - name: Log into Amazon ECR

        uses: aws-actions/amazon-ecr-login@v1
      - name: Create ECR Repo
        uses: codezninja/create-ecr-repo-action@v1
        with:
          DOCKER_REPO_NAME: ${{ env.REPO }} # Your repo name goes here
      # ...

```

<details>
<summary>Or for a more complicated example, if you want to override the retained certain number of tagged images...</summary>
<p>

```yaml
on: push
# ...
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # ...
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
      - name: Log into Amazon ECR
        uses: aws-actions/amazon-ecr-login@v1
      - name: Create ECR Repo
        uses: codezninja/create-ecr-repo-action@v1
        with:
          DOCKER_REPO_NAME: ${{ env.REPO }} # Your repo name goes here
          NUM_DAYS_BEFORE_EXPIRING_UNTAGGED_IMAGES: 14
          TAG_PREFIX: 'feature-'
          NUM_TAGGED_IMAGES_TO_RETAIN: 5
      # ...
```

</p>
</details>
