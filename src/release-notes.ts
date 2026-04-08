/* eslint-disable no-console */

import { getConfigForPart } from './config-per-part'
import {
  checkDiffForFolder,
  sendToSlack,
} from './helpers';

const run = async () => {
  const part = process.argv[3]
  const gitCommitReleased = process.argv[4]
  if (!part) {
    throw new Error('Missing argument for which deployable part to create release notes for. Usage: "yarn release:notes <part>"')
  }

  const config = getConfigForPart(part)
  const diffInfo = await checkDiffForFolder({
    ...config,
    stableCodeReference: gitCommitReleased || config.stableCodeReference,
  })

  if (
    process.argv.includes('--slack') &&
    process.env.SLACK_DEPLOYMENT_WEBHOOK_URL
  ) {
    const {
      logStable,
      prodCommit,
      prodCommitDescription,
      stableCodeReference,
      stableBranchCommit,
    } = diffInfo;

    if (!logStable) {
      return
    }

    const slackBlocks = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:rocket: *Production deployment for ${part} started*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Previous prod commit: ${prodCommitDescription}${
              prodCommit !== prodCommitDescription ? ' ' + prodCommit : ''
            } --> ${stableCodeReference} ${
              gitCommitReleased ? '' :
              stableBranchCommit.slice(0, 9)
            }`,
          },
        },
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_preformatted',
              elements: [
                {
                  type: 'text',
                  text: logStable,
                },
              ],
            },
          ],
        }
      ],
    };

    await sendToSlack(process.env.SLACK_DEPLOYMENT_WEBHOOK_URL, slackBlocks);
  }
};

run();
