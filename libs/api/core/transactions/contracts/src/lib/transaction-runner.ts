export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

export abstract class TransactionContext {
  declare private readonly transactionContextBrand: void;
}

export interface TransactionRunner {
  run<Result>(
    operation: (context: TransactionContext) => Promise<Result>,
  ): Promise<Result>;
}
