/// <reference path="../generic.d.ts" />

import { expect } from 'chai'
import { SendEmail } from '../index'
import * as AWSMock from 'aws-sdk-mock'
import * as AWS from 'aws-sdk'
import { join } from 'path'
import { readFile } from 'fs'
import 'mocha';

const fixture = (name: string) => join(__dirname, 'fixtures', name)

const readFileAsync = async (fixtureFile: string) => new Promise<string>((resolve, reject) => {
  readFile(fixture(fixtureFile), (err, result) => {
    err ? reject(err) : resolve(result.toString())
  })
})

type ResponseType<T> = T & { $response: AWS.Response<T, any> };

const SEND_QUOTA = {
  $response: {

  },
  Max24HourSend: 1000,
  MaxSendRate: 1,
  SentLast24Hours: 0
} as ResponseType<AWS.SES.GetSendQuotaResponse>

suite('aws-mjml-csv', () => {

  setup(function() {
    // mock REGION for tests
    process.env['AWS_DEFAULT_REGION'] = 'us-east-1'
    AWS.config.region = 'us-east-1'

    const test =  this.currentTest.title
    const suite = this.currentTest.parent.title

    AWSMock.mock('SES', 'sendEmail', (params, callback) => {
      if (params.Destination.ToAddresses[0] === 'error@github.com') {
        return callback(new Error('Failed to send'))
      }

      callback(null, {
      } as ResponseType<AWS.SES.SendEmailResponse>)
    })

    AWSMock.mock('SES', 'getSendQuota', (callback) => {
      if (
        suite === 'setQuota'
      ) {
        if (test === 'throw') {
          callback(new Error('getSendQuota'))
        } else if (test === 'AWS plain') {
          callback(null, {
            ...SEND_QUOTA,
            $response: {
              error: 'getSendQuota'
            }
          })
        } else if (test === 'AWS error') {
          callback(null, {
            ...SEND_QUOTA,
            $response: {
              error: new Error('getSendQuota')
            }
          })
        } else {
          callback(null, SEND_QUOTA)
        }
      } else {
        callback(null, SEND_QUOTA)
      }
    })

    this.instance = new SendEmail({
      source: 'example@example.com',
      subject: suite !== 'setSubjectTemplate' ? 'Hello {{ name }}' : undefined,
      returnPath: 'bounce@example.com'
    })
  })

  teardown(function(){
    AWSMock.restore('SES')
  })

  suite('setQuota', () => {

    test('sets', async function() {
      const i: SendEmail = this.instance

      await i.setQuota()

      expect(i.quota).to.deep.equal({
        Max24HourSend: SEND_QUOTA.Max24HourSend,
        MaxSendRate: SEND_QUOTA.MaxSendRate,
        SentLast24Hours: SEND_QUOTA.SentLast24Hours
      } as AWS.SES.GetSendQuotaResponse)
    })

    test('throw', async function() {
      const i: SendEmail = this.instance

      try {
        await i.setQuota()
      } catch (e) {
        expect(i.quota).to.deep.equal({})
        expect(e.message).to.equal('getSendQuota')
      }
    })

    test('AWS plain', async function() {
      const i: SendEmail = this.instance

      try {
        await i.setQuota()
      } catch (e) {
        expect(i.quota).to.deep.equal({})
        expect(e.message).to.equal('getSendQuota')
      }
    })

    test('AWS error', async function() {
      const i: SendEmail = this.instance

      try {
        await i.setQuota()
      } catch (e) {
        expect(i.quota).to.deep.equal({})
        expect(e.message).to.equal('getSendQuota')
      }
    })

  })

  suite('constructor', () => {

    test('throw', function() {
      expect(() => {
        new SendEmail({} as any)
      }).to.throw('source')

      expect(() => {
        AWS.config.region = undefined

        new SendEmail({
          source: 'example@example.com',
          returnPath: 'bounce@example.com'
        })
      }).to.throw('AWS_REGION')
    })

  })

  suite('setMjml', () => {

    test('output', async function() {
      const i: SendEmail = this.instance

      await i.setMjml(fixture('index.mjml'))

      expect(i.mjml).to.equal(await readFileAsync('index.handlebars'))
    })

    test('invalid', async function() {
      const i: SendEmail = this.instance

      try {
        await i.setMjml(fixture('invalid.mjml'))

        expect.fail('Shouldnt reach here')
      } catch (e) {
        expect(e).to.be.an('Error')
        expect(e.message).to.match(/EmptyMJMLError/)
      }

      try {
        await i.setMjml(fixture('semi-invalid.mjml'))

        expect.fail('Shouldnt reach here')
      } catch (e) {
        expect(e).to.be.an('Error')
        expect(e.message).to.match(/Line 10/)
      }

    })

    test('throw', async function() {
      const i: SendEmail = this.instance

      try {
        await i.setMjml('asdf')

        expect.fail('This should never be reached')
      } catch (e) {
        expect(e).to.be.an('Error', 'should be ENOENT')
      }
    })

  })

  suite('precompile', () => {

    test('sets function', async function() {
      const i: SendEmail = this.instance

      i.mjml = await readFileAsync('index.handlebars');

      i.compile()

      expect(i.compiled).to.be.a('function')
    })

    test('throw', function() {
      const i: SendEmail = this.instance

      expect(() => {
        i.compile()
      }).to.throw('No template available')
    })

  })

  suite('body', () => {

    test('set variables', async function() {
      const i: SendEmail = this.instance

      await i.setMjml(fixture('index.mjml'))

      //writeFileSync(fixture('email.html'), instance.template({name: 'Github'}))

      expect(i.body({name: 'Github'})).to.equal(await readFileAsync('email.html'))
    })

    test('throw', function() {
      const i: SendEmail = this.instance

      expect(() => {
        i.body({name: 'Github'})
      }).to.throw()
    })

  })

  suite('setSubjectTemplate', () => {

    test('handlebars', function() {
      const i: SendEmail = this.instance

      i.setSubjectTemplate('Hello {{ name }}')

      expect(i.subjectTemplate).to.be.a('function')

      expect(i.subject({ name: 'Github' })).to.equal('Hello Github')
    })

    test('throw', function(){
      const i: SendEmail = this.instance

      expect(() => {
        i.subject({ name: 'Github' })
      }).to.throw('No subject set')

      expect(() => {
        i.setSubjectTemplate('Hello {{ name }}')
        i.subject({  })
      }).to.throw('not defined in')
    })

    test('do nothing', function() {
      const i: SendEmail = this.instance

      i.setSubjectTemplate('')

      expect(i.subjectTemplate).to.be.a('null')
    })

  })

  suite('emailOptions', () => {

    test('default', async function(){
      const i: SendEmail = this.instance

      await i.setMjml(fixture('index.mjml'))

      const vars = { name: 'Github' }

      expect(i.emailOptions({
        email: 'test@test.com',
        vars
      })).to.deep.equal({
        Destination: {
          ToAddresses: ['test@test.com']
        },
        ReturnPath: 'bounce@example.com',
        Source: 'example@example.com',
        Message: {
          Body: {
            Html: {
              Charset: 'utf-8',
              Data: i.body(vars)
            }
          },
          Subject: {
            Charset: 'utf-8',
            Data: i.subject(vars)
          }
        },
      })
    })

  })

  suite('setCsvfromPath', () => {

    test('set readStream', async function() {
      const i: SendEmail = this.instance

      await i.setCsvfromPath(fixture('emails.csv'))

      expect(i.readStream).to.be.an('object')
    })

    test('throw', async function() {
      const i: SendEmail = this.instance

      try {
        await i.setCsvfromPath('asdf.asdf')

        expect.fail('Should not reach here')
      } catch (e) {
        expect(e.message).to.match(/ENOENT/)
      }
    })

  })


  suite('send', () => {

    test('sending email to CSV with proper template', async function() {
      this.timeout(5000)

      const i: SendEmail = this.instance
      let sent = 0
      let errors = 0

      i.on('sent', ({ result, time, row }) => {
        sent++
        expect(result).to.be.an('object')
        expect(time).to.be.a('number')
        expect(row).to.be.an('object')
      })

      i.on('error', ({ error, time, row }) => {
        errors++
        expect(error).to.be.an('error')
        expect(time).to.be.a('number')
        expect(row).to.be.an('object')
      })

      await i.setMjml(fixture('index.mjml'))
      await i.setCsvfromPath(fixture('emails.csv'))

      await i.send()

      expect(sent).to.equal(2)
      expect(errors).to.equal(1)
    })

    test('throw', async function() {
      const i: SendEmail = this.instance

      try {
        await i.setQuota()
        await i.send()

        expect.fail('Should not reach here')
      } catch (e) {
        expect(e.message).to.equal('No CSV file set')
      }
    })

  })

})