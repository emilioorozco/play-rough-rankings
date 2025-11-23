// Type declarations for sns-validator package
declare module 'sns-validator' {
  export default class MessageValidator {
    constructor();
    validate(message: any): Promise<void>;
  }
}
