/* eslint-disable no-console */

import colors from 'colors';

import {
  getConfigForAllParts
} from './config-per-part'
import {
  checkDiffForFolder,
  sendToSlack,
  DiffResult
} from './helpers';

const run = async () => {
  const logList: DiffResult[] = []
  for (const config of getConfigForAllParts()) {
    const item = await checkDiffForFolder(config)
    logList.push(item)
  }

  const uniqueTickets = Array.from(new Set(logList.flatMap(({ tickets }) => Array.from(tickets))));
  console.log(colors.magenta('Tickets'), uniqueTickets);
  console.log('');

  if (
    process.argv.includes('--slack') &&
    process.env.SLACK_DEPLOYMENT_WEBHOOK_URL
  ) {
    const msgBody = logList.flatMap(
      ({
        folder,
        logStable,
        logLatest,
        prodCommit,
        stableCodeReference,
        stableBranchCommit,
        latestCodeReference,
        onlySubfolder,
      }) => {
        if (!logStable && !logLatest) {
          return [];
        }
        const sections: any[] = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Diff for ${onlySubfolder || folder}*`,
            },
          },
        ];
        if (logStable) {
          sections.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Prod* ${
                prodCommit.slice(0, 9)
              } --> *${stableCodeReference}* ${
                stableBranchCommit.slice(0, 9)
              }`,
            },
          });
          sections.push({
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
          });
        }
        if (logLatest) {
          sections.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${stableCodeReference} --> ${latestCodeReference}*`,
            },
          });
          sections.push({
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_preformatted',
                elements: [
                  {
                    type: 'text',
                    text: logLatest,
                  },
                ],
              },
            ],
          });
        }
        sections.push({
          type: 'divider',
        });
        return sections;
      }
    );

    const slackBlocks = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':rocket: Production diff report :rocket:',
          },
        },
        { type: 'divider' },
        ...msgBody,
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Unique tickets* :ticket:\n${uniqueTickets.join(
                ', '
              )}\n\n`,
            },
          ],
        },
      ],
    };
    await sendToSlack(process.env.SLACK_DEPLOYMENT_WEBHOOK_URL, slackBlocks);
  }
};

run();
