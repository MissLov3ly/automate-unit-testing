# Gelato Automate Unit tests examples

The purpose of this repo is to showcase unit tests examples of using Gelato Automate in a Hardhat enviroment. 

## Contract Examples

In the [contracts folder](/contracts/) we have following contract structure

**contractCreator**

    -- withoutTreasury

  * [CounterResolverTaskCreatorWT.sol](/contracts/contractCreator/withoutTreasury/CounterResolverTaskCreatorWT.sol) 

  * [CounterSingleExecTaskCreatorWT.sol](/contracts/contractCreator/withoutTreasury/CounterSingleExecTaskCreatorWT.sol) 

  * [CounterTimeTaskCreatorWT.sol](/contracts/contractCreator/withoutTreasury/CounterTimeTaskCreatorWT.sol) 

  -- withTreasury   

  * [CounterResolverTaskCreator.sol](/contracts/contractCreator/withTreasury/CounterResolverTaskCreator.sol) 

  * [CounterSingleExecTaskCreatorWT.sol](/contracts/contractCreator/withTreasury/CounterSingleExecTaskCreatorWT.sol) 

  * [CounterTimeTaskCreator.sol](/contracts/contractCreator/withTreasury/CounterTimeTaskCreator.sol) 


  **userCreator**

 -- withoutTreasury
  * [CounterWT.sol](/contracts/userCreator/withoutTreasury/CounterWT.sol)  
  * [CounterResolverWT.sol](/contracts//userCreator/withoutTreasury/CounterResolverWT.sol)  

 -- withTreasury
  * [Counter.sol](/contracts/userCreator/withTreasury/Counter.sol)      
  * [CounterResolver.sol](/contracts/userCreator/withTreasury/CounterResolver.sol)     

The [gelato folder](/contracts/gelato) contain all of the helper contracts that are needed for all of the examples.


## Tests

**test structure contractCreator**

    -- withoutTreasury

  * [CounterResolverTaskCreatorWT.test.ts](test/contractCreator/withoutTreasury/CounterResolverTaskCreatorWT.test.ts) 

  * [CounterSingleExecTaskCreatorWT.test.ts](test/contractCreator/withoutTreasury/CounterSingleExecTaskCreatorWT.test) 

  * [CounterTimeTaskCreatorWT.test.ts](test/contractCreator/withoutTreasury/CounterTimeTaskCreatorWT.test.ts) 

  -- withTreasury   

  * [CounterResolverTaskCreator.test.ts](test/contractCreator/withTreasury/CounterResolverTaskCreator.test.ts) 

  * [CounterSingleExecTaskCreator.test.ts](test/contractCreator/withTreasury/CounterSingleExecTaskCreator.test.ts) 

  * [CounterTimeTaskCreator.test.ts](test/contractCreator/withTreasury/CounterTimeTaskCreator.test.ts) 

**test structure userCreator**

    -- withoutTreasury

  * [CounterResolverUserCreatorWT.test.ts](test/userCreator/withoutTreasury/CounterResolverUserCreatorWT.test.ts) 

  * [CounterSingleExecUserCreatorWT.test.ts](test/userCreator/withoutTreasury/CounterSingleExecUserCreatorWT.test.ts) 

  * [CounterTimeUserCreatorWT.test.ts](test/userCreator/withoutTreasury/CounterTimeUserCreatorWT.test.ts) 

  -- withTreasury   

  * [CounterResolverUserCreator.test.ts](test/userCreator/withTreasury/CounterResolverUserCreator.test.ts) 

  * [CounterSingleExecUserCreator.test.ts](test/userCreator/withTreasury/CounterSingleExecUserCreator.test.ts) 

  * [CounterTimeUserCreator.test.ts](test/userCreator/withTreasury/CounterTimeUserCreator.test.ts) 



1) Before start to testing we would need to:
`copy .env-template to .env` and add the RPC you are using as well as the private key (pk only in case you want to deploy to testnet)

2) run `yarn test`

All of the tests can be found at [test folder](/test/) with one test file `.test.ts` per contract.

We run 3 tests on every contract:

1 - Create a task and check if the TaskId is correct

2 - Create a task and execute expecting revert as we haven't any funds (either treasuty or contract)

3 - Create a task, fund the treasury or contract, execute the task and check if the cunter has increase in 1.

The test execution follows in every example this pattern:

```ts
    await impersonateAccount(GELATO_ADDRESS)
    executor = ethers.provider.getSigner(GELATO_ADDRESS);
    
    console.log("\x1b[32m%s\x1b[0m", "    ->", `\x1b[30mCreating the task`);
    console.log(" ");

    counter = await ethers.getContract("CounterResolverTaskCreatorWT", user);
    await counter.createTask();

    // DEPOSIT funds into the contract
    const depositAmount = ethers.utils.parseEther("100");
    await setBalance(counter.address, depositAmount)
   
    //// EXECUTION
    await automate
      .connect(executor)
      .exec(counter.address, counter.address, check1.execPayload, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      });

;
```

