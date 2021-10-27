#!/usr/bin/env node
const fs = require('fs-extra');
const chalk = require('chalk');
const argv = require('yargs')
  .option('jsonfile', {
    alias: 'f',
    type: 'string',
    default: 'jsonOutput.json',
    description: 'JSON file name to be read. Defaults to "jsonOutput.json"',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    default: 'ng-lint-report',
    description:
      'Result folder where report is generated. Defaults to "ng-lint-report"',
  })
  .option('filename', {
    alias: 'n',
    type: 'string',
    default: 'report.html',
    description: 'Result file name. Defaults to "report.html"',
  }).argv;
const path = require('path');
const currentWorkingDir = process.cwd().replace(/[\\]/g, '/');
const rootDir = __dirname.replace(/[\\]/g, '/');
const jsonOutputPath = argv.jsonfile;
const reportOutputPath = argv.output;
const outputFileName = argv.filename;

const eslintErrorMap = {
  1: 'WARNING',
  2: 'ERROR',
};

function sanitize(str) {
  str = str.replace(/['"$]/g, (match) => {
    if (match === `'`) return `&apos;`;
    if (match === `"`) return `&quot;`;
    if (match === '$') return `&#36;`;
    return match;
  });
  return str;
}

if (typeof jsonOutputPath === 'string') {
  const htmlTemplate = fs.readFileSync(`${rootDir}/src/index.html`, 'utf8');
  try {
    let jsonOutput = [];
    try {
      jsonOutput = JSON.parse(
        fs.readFileSync(path.join(currentWorkingDir, jsonOutputPath), 'utf8')
      );
    } catch (e) {
      jsonOutput = [];
    }
    let isEslint = false;
    let totalEslintErrors = 0;
    const totalErrors = jsonOutput.length;
    // Process JSON
    if (Array.isArray(jsonOutput)) {
      const jsonMap = {};
      jsonOutput.forEach((item) => {
        isEslint = !!item.filePath;
        const baseItemName = path.basename(
          isEslint ? item.filePath : item.name
        );
        if (!jsonMap[baseItemName]) {
          jsonMap[baseItemName] = [];
        }
        if (isEslint) {
          const hasErrors = Array.isArray(item.messages);
          totalEslintErrors += hasErrors ? item.messages.length : 0;
          if (hasErrors) {
            item.messages.forEach((msg) => {
              jsonMap[baseItemName].push({
                path: item.filePath,
                rule: msg.ruleId,
                type: eslintErrorMap[msg.severity],
                failure: msg.message,
                position: `Line: ${msg.line} Col: ${msg.column}`,
              });
            });
          }
        } else {
          jsonMap[baseItemName].push({
            path: item.name,
            rule: item.ruleName,
            type: item.ruleSeverity,
            failure: item.failure,
            position: `Line: ${item.endPosition.line} Col: ${item.startPosition.character}`,
          });
        }
      });
      jsonOutput = null;
      // Render output
      let html = `<h3>Total Issues: ${
        isEslint ? totalEslintErrors : totalErrors
      }</h3>`;
      const jsonMapKeys = Object.keys(jsonMap);
      if (jsonMapKeys.length) {
        jsonMapKeys.forEach((filename) => {
          html += `<button class="file-name clearfix">${filename} <em class="float-right">(${jsonMap[filename].length} issue(s) found) <span>+</span></em></button>`;
          html += `<div class="result-wrap">
                <ul><li class="item-head"><span>Description</span><span>Rule</span><span>Error</span><span>Position</span></li>${jsonMap[
                  filename
                ]
                  .map((item) => {
                    return `<li title="${encodeURIComponent(
                      item.path
                    )}" class="item is-${item.type.toLowerCase()}">
                    <span class="item-cell failure">${sanitize(
                      item.failure
                    )}</span>
                    <span class="item-cell rule">${item.rule}</span>
                    <span class="item-cell type">${item.type}</span>
                    <span class="item-cell position">${item.position}</span>
                    </li>`;
                  })
                  .join('')}</ul>
                </div>`;
        });
      } else {
        html += '<h2>No errors!</h2>';
      }
      const outputFolders = path.join(currentWorkingDir, reportOutputPath);
      if (!fs.existsSync(outputFolders)) fs.mkdirsSync(outputFolders);
      fs.writeFileSync(
        path.join(outputFolders, outputFileName),
        htmlTemplate.replace(
          /##placeholder##/,
          `<div class="result-outer-wrap">${html.trim()}</div>`
        ),
        'utf8'
      );
    } else {
      throw new Error('JSON format is not valid');
    }
  } catch (e) {
    console.log(chalk.bold(chalk.red('Invalid JSON or error in processing')));
    console.log(chalk.red(e.message));
  }
} else {
  console.log(chalk.bold(chalk.red('Please provide a valid JSON path')));
}
