/// <reference path="./generic.d.ts" />

import 'mjml'
import { mjml2html, Options as MJMLOptions } from 'mjml-core'
import * as AWS from 'aws-sdk'
import { compile } from 'handlebars'
import { readFile, createReadStream, ReadStream } from 'fs'
import { obj } from 'through2'
import * as CSV from 'csv-parser'
import { RateLimiter } from 'limiter'
import { EventEmitter } from 'events'

export type CSVType = typeof CSV.CSV

export interface Options {
  encoding?: string;
  level?: MJMLOptions['level'];
  returnPath?: string;
  source: string;
  subject?: string;
  csv?: typeof CSV.Options;
}

export type SentEventResult<T> = {
  /** miliseconds that took send */
  time: number;
  /** AWS result */
  result: AWS.SES.SendEmailResponse;
  /** Row of CSV data */
  row: T;
}
export type ErrorEventResult<T> = {
  /** miliseconds that took the error */
  time: number;
  error: AWS.AWSError;
  /** Row of CSV data */
  row: T;
}
export type SentEvent<T> = (result: SentEventResult<T>) => void;
export type ErrorEvent<T> = (result: ErrorEventResult<T>) => void;

export interface SendEmailOptions {
  /**
   * Variables to pass to the handlebars template
   */
  vars: { [index: string]: any };
  /**
   * Address itself
   */
  email: string;
}

export class SendEmail extends EventEmitter {
  public ses: AWS.SES
  public mjml: string = ''
  public compiled: HandlebarsTemplateDelegate | null = null
  public quota: AWS.SES.GetSendQuotaResponse = {}
  public subjectTemplate: HandlebarsTemplateDelegate | null = null
  public options: Options
  public readStream: ReadStream | null = null;

  constructor(
    options: Options
  ) {
    super()

    this.options = {
      encoding: 'utf-8',
      level: 'strict',
      source: '',
      returnPath: undefined,
      ...options,
      csv: {
        ...options.csv,
        raw: false,
        strict: false
      }
    }

    if (!this.options.source) {
      throw new Error('Must define the "source" option')
    }

    if (!AWS.config.region) {
      throw new Error('Missing AWS_DEFAULT_REGION / AWS_REGION setting')
    }

    this.ses = new AWS.SES()

    if (this.options.subject) {
      this.setSubjectTemplate(this.options.subject)
    }
  }

  async setQuota() {
    try {
      const result = await this.ses.getSendQuota().promise()

      if (result && result.$response && result.$response.error) {
        throw (typeof result.$response.error == 'string' ? new Error(result.$response.error) : result.$response.error)
      }

      this.quota = {
        Max24HourSend: result.Max24HourSend,
        MaxSendRate: result.MaxSendRate,
        SentLast24Hours: result.SentLast24Hours
      }
    } catch (e) {
      throw e
    }
  }

  compile() {
    if (!this.mjml) {
      throw new Error('No template available')
    }

    this.compiled = compile(this.mjml, {
      strict: true,
    })

    return this
  }

  body(vars: any) {
    if (!this.compiled) {
      throw new Error('No template available')
    }

    return this.compiled(vars, {

    })
  }

  subject(vars: any) {
    if (!this.subjectTemplate) {
      throw new Error('No subject set')
    }

    return this.subjectTemplate(vars, {

    })
  }

  async setMjml(path: string) {
    const fileContents = await new Promise<string>((resolve, reject) => {
      readFile(path, (err, result) => {
        err ? reject(err) : resolve(result.toString())
      })
    })

    try {
      this.mjml = mjml2html(fileContents, {
        level: this.options.level!,
      }).html
    } catch (e) {
      if (e.getMessages) {
        throw new Error(e.getMessages().join('\n'))
      }

      throw e
    }

    return this.compile()
  }

  setSubjectTemplate(subject?: string) {
    if (!subject) {
      return this
    }

    this.subjectTemplate = compile(subject, {
      strict: true,
    })

    return this
  }

  async setCsvfromPath(path: string) {
    const CSV = new Promise<ReadStream>((resolve, reject) => {
      const readStream = createReadStream(path)

      readStream.on('error', (e) => {
        reject(e)
      })

      readStream.on('open', () => {
        resolve(readStream)
      })
    })

    try {
      this.readStream = await CSV

      return this
    } catch (e) {
      this.readStream = null
      throw e
    }
  }

  emailOptions(options: SendEmailOptions): AWS.SES.SendEmailRequest {
    return {
      Destination: {
        ToAddresses: [
          options.email
        ]
      },
      ReturnPath: this.options.returnPath,
      Source: this.options.source,
      Message: {
        Body: {
          Html: {
            Charset: this.options.encoding,
            Data: this.body(options.vars)
          }
        },
        Subject: {
          Charset: this.options.encoding,
          Data: this.subject(options.vars)
        }
      },
    }
  }

  parseCSV(): CSVType {
    return this.readStream!
      .pipe(
        CSV({
          ...this.options.csv
        })
      )
  }

  async send() {
    if (!this.readStream) {
      throw new Error('No CSV file set')
    }

    await this.setQuota()

    const maxRate = this.quota.MaxSendRate!

    return new Promise((resolve, reject) => {
      const limit = new RateLimiter(maxRate, 'sec')

      this.parseCSV()
      .pipe(
        obj(
          (row, _encoding, callback) => {
            limit.removeTokens(1, () => {
              const start = Date.now()

              this.ses.sendEmail(
                this.emailOptions({
                  email: row.email,
                  vars: { ...row }
                }
              ), (error, result) => {
                if (error) {
                  this.emit('error', { error, time: Date.now() - start, row })

                  return callback() // discard row
                }

                this.emit('sent', { result, row, time: Date.now() - start })

                callback() // discard row
              })
            })
          },
          resolve
        )
      )
      .on('error', reject)
    })
  }
}