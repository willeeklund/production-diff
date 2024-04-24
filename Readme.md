# Production diff scripts

Here we have ways to understand what are the parts where we have merged code but we have not yet put it in production.

There are currently two parts:
* See the diff for all our deployable parts
* See the diff for an individual part

## Full diff report
There is a daily job running to generate the full diff and send a Slack message to the channel you have set up with the webhook sent in as `SLACK_DEPLOYMENT_WEBHOOK_URL`.

This can also be run locally (make sure the relevant Git repos for deployable parts all live in the same parent folder):

```
yarn git:compare:prod
```

## Release notes for individual part
To see the diff for an individual part, you can run:

```
yarn release:notes <name-of-part-to-deploy>
```

When we do production releases this output may be useful to paste in to the Github UI as release notes.

As part of the CI job when we have started production release, this report will be gathered and sent as a Slack message (to the same channel). This will make it possible for us and other people in the organisation to know when we make releases and what changes are going out.

## Incorporate with a Github workflow setup
When building your Docker image for your application, send in the Git commit which was used.

```
- name: Build and push
    uses: docker/build-push-action@v5
    with:
        build-args: CODE_VERSION_COMMIT=${{ github.sha }}
```

See `CODE_VERSION_COMMIT` sent in as a build argument above.

To expose that as a public file, see the example file `Dockerfile.example`.
