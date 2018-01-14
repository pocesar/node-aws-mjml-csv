declare module 'aws-sdk-mock' {
  import AWS from 'aws-sdk';

  type AWSType<T> = {
    [index in keyof T]: T[index];
  }
  /**
   * Replaces a method on an AWS service with a replacement function or string.
    Param 	Type 	Optional/Required 	Description
    service 	string 	Required 	AWS service to mock e.g. SNS, DynamoDB, S3
    method 	string 	Required 	method on AWS service to mock e.g. 'publish' (for SNS), 'putItem' for 'DynamoDB'
    replace 	string or function 	Required 	A string or function to replace the method
   */
  export function mock<K extends keyof AWS.SES>(service: 'SES', method: K, replace: (params: any, callback: Function) => void): any;
  export function mock<T extends typeof AWS>(service: T, method: any, replace: Function): any;

  /**
   * Removes the mock to restore the specified AWS service
    Param 	Type 	Optional/Required 	Description
    service 	string 	Optional 	AWS service to restore - If only the service is specified, all the methods are restored
    method 	string 	Optional 	Method on AWS service to restore
    If AWS.restore is called without arguments (AWS.restore()) then all the services and their associated methods are restored i.e. equivalent to a 'restore all' function.
   */
  export function restore<K extends keyof AWS.SES>(service: 'SES', method: K): any;
  export function restore<T extends keyof typeof AWS>(service?: T, method?: string): any;

  /**
   * Explicitly set the require path for the aws-sdk
   * Param 	Type 	Optional/Required 	Description
   * path string 	Required 	Path to a nested AWS SDK node module
   */
  export function setSDK(path: typeof AWS): any;

  /**
   * Explicitly set the aws-sdk instance to use
   */
  export function setSDKInstance(sdk: typeof AWS): any;
}

declare module 'mjml-core' {
  export interface Options {
    level: "soft" | 'strict';
    minify?: boolean;
  }
  export function mjml2html(mjml: string, options: Options): {
    errors: string[];
    html: string
  };
}

declare module 'csv-parser' {
  import { WriteStream } from 'fs'

  interface Options {
    /** do not decode to utf-8 strings */
    raw?: boolean;
    /** specify optional cell separator*/
    separator?: string;
    /** specify optional quote character*/
    quote?: string;
    /** specify optional escape character (defaults to quote value)*/
    escape?: string;
    /** specify a newline character*/
    newline?: string;
    /** Specifing the headers */
    headers?: string[];
    /** require column length match headers length */
    strict?: boolean;
  }

  class CSV extends WriteStream {
    constructor(opts?: Options);
  }

  type CSVType = {
    (opts: Options): CSV;
    Options: Options;
    CSV: CSV;
  }

  const fn: CSVType;

  export = fn;
}
