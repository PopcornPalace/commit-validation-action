import * as core from '@actions/core'
import * as github from '@actions/github'
import * as crypto from 'crypto'
import fetch from 'node-fetch'
import * as fs from 'fs'

const KEYS_SERVER_URL = 'https://keys.openpgp.org/'
var DEBUG = true

interface ConfigUser {
  allow_without_validation: string
}
interface Config {
users: ConfigUser
}

async function getCommitEmail(): Promise<string> {
  const output = await execShellCommand('git log -1 --pretty=format:%ae')
  return output.trim()
}

async function execShellCommand(command: string): Promise<string> {
  const exec = require('child_process').exec
  return new Promise<string>((resolve, reject) => {
    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout || stderr)
      }
    })
  })
}

async function execShellCommandPassError(command: string): Promise<string> {
  const exec = require('child_process').exec
  return new Promise<string>((resolve, reject) => {
    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) {
        resolve(stdout || stderr)
      } else {
        resolve(stdout || stderr)
      }
    })
  })
}

async function validateCommit() {
  const dir = fs.realpathSync(process.cwd());
  const isUseConfig: string = core.getInput('use_config')
  const configFile: string = core.getInput('config_file')
  //DEBUG = core.getBooleanInput('debug')

  try {
    const email = await getCommitEmail()
    if (email.includes('@users.noreply.github.com')) {
      core.setOutput('commit', 'System email is being used')
      await core.summary.addRaw("The email address associated with GitHub noreply has already been used. I cannot validate the commit or pull reques").write();
      return 
    }

    if (isUseConfig === "true") {
        const jsonString = fs.readFileSync(configFile, 'utf-8');
        let jsonData: Config = JSON.parse(jsonString);
        if (DEBUG){
          console.log(jsonData)
        }
        if(jsonData.users.allow_without_validation.includes(email) === true) {
          core.setOutput('commit', 'Your commit is valid')
          await core.summary.addRaw("✅ Your commit is trust for us ").write();
          return
        }
    }

    const gitSignatureCommand = 'git log -n 1 --show-signature --format="%h %G?"'
    const res = await execShellCommandPassError(gitSignatureCommand)
    const output = res.trim()
    if(DEBUG) {
      console.log(output)
    }
    if (output.endsWith('G')) {
      core.setOutput('commit', 'Your commit is valid')
      await core.summary.addRaw("✅ Your commit is valid ").write()
    } else {
      core.setFailed('Commit is not signed or not valid')
      await core.summary.addRaw(`❌ Commit is not signed or not valid`).write()
    }
  } catch (error) {
    core.setFailed("error: " + error)
  }

}

validateCommit()
