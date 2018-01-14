[![Build Status](https://travis-ci.org/pocesar/node-aws-mjml-csv.svg?branch=master)](https://travis-ci.org/pocesar/node-aws-mjml-csv)
[![npm version](https://badge.fury.io/js/aws-mjml-csv.svg)](https://badge.fury.io/js/aws-mjml-csv)
[![Coverage Status](https://coveralls.io/repos/github/pocesar/node-aws-mjml-csv/badge.svg?branch=master)](https://coveralls.io/github/pocesar/node-aws-mjml-csv?branch=master)

# aws-mjml-csv

CLI and programatic API to send emails using MJML (that is then parsed by Handlebars.js), populating your email passing the CSV columns to your template. Will try to throttle according to your current limits.

## Why

Sending email using an interface is great if you don't know what you're doing. You have a nice WYSIWYG interface, some drag'n'drop widgets, and a shiny file manager. Emails this way are ok, but usually you'll want something more solid, giving your designer to use MJML instead, using Handlebars inside your MJML template, and create a nice professional responsive look and "feels like home" emails crafted to customers. For that templating capabilities you'll have to resort to paid services, like Mailchimp or Sendgrid, using their templating language. This is a really cost effective alternative (plus 62k free emails per month on AWS).

Pass as many variables that are important using CSV, slap in a template using `.mjml` file, and you're ready to go

## How

Install it globally or locally using:

```bash
npm i aws-mjml-csv -g
```

You can either send it immediately using the command line like so:

```bash
~$ aws-mjml-csv --source example@example.com --subject "Hello {{ name }}" --csv /path/to/contacts.csv --dry-run --template /path/to/template.mjml
```

or in your code:

```ts
import { SendEmail } from 'aws-mjml-csv'
import * as AWS from 'aws-sdk'

const instance = new SendEmail({
  source: 'example@example.com'
})

(async () => {
  await instance.setMjml('./template.mjml')
  await instance.setCsvfromPath('./contacts.csv')

  let sent = 0
  let errors = 0

  instance.on('sent', ({ result, row, time }: { time: number, result: AWS.SES.Types.SendEmailResponse, row: Object }) => {
    sent++
  })

  instance.on('error', ({ error, row, time }: { time: number, error: AWS.AWSError, row: Object }) => {
    errors++
  })

  await instance.send()

  console.log(`Sent ${sent} emails (${error} failed)`)
})()
```

If you are in a sandbox for SES, you'll be able to send 1 email per second, up to 1000. This module will throttle the sending depending on your quota.

Notice that you need at least one column called `email`. AWS configuration are either done using credentials on the machine or using environment variables, check [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/aws-security-credentials.html) for that. Remember to set `AWS_DEFAULT_REGION`, `AWS_SECRET_ACCESS_KEY` and `AWS_ACCESS_KEY_ID`

## Caveats

Although `csv-parser` is really performant and it's a stream, depending on the size of your email list, node.js might reach it's max memory waiting for SES.

## License

MIT

## Development

* BTC: `16QDbqa6UMFtMCdDcJJ5N2bqryH4Q56BVU`
* BCH: `1E6gKfkyxsjr2rSbcHbnfsQumKxkGKwRYc`
* ETH: `0xfF9087E7112d3b7D7B5bDD6C9ffb0970ACC162E7`
* MIOTA: `NNIH9VGEQFZAJIITBO9FEDSYUDYXHMAINGSKWIU9ADUHYYNTIYGJADZITOCVMWEFTKJGCNCJN9ZRFUZKCPSUOMDAKD`
* NXT: `NXT-7TJT-8NS2-8QBS-5Y89X`
* BTG: `GY2RWXUKYDmYDaroMmucgUdF7dLqaHDKWu`
* XEM: `NBC772-Q3SL4X-AGVNMP-JAWGJE-U6BCSB-Q7WNAX-YU5V`
* DASH: `XaqxcT3BDmSLGB4M6ozrET1qJPBA4RJpng`
* XRB: `xrb_3fi16pk4gyz331r4531m7jywrfsgp3h31yoyfusac77esuamh65r5kwjz7dm`