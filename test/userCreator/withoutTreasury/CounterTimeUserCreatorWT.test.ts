/* eslint-disable @typescript-eslint/no-explicit-any */
import { Signer } from "@ethersproject/abstract-signer";
import { expect } from "chai";
import hre = require("hardhat");

import { getAutomateAddress, getGelatoAddress, getTreasuryAddress } from "../../../hardhat/config/addresses";

const { ethers, deployments } = hre;
import {
  ITaskTreasuryUpgradable,
  IAutomate,
  CounterResolverTaskCreatorWT,
  CounterResolverWT,
  CounterWT,
} from "../../../typechain";
import { fastForwardTime, getTaskId, getTimeStampNow, Module } from "../../utils";
import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";

const TASK_TREASURY_ADDRESS = getTreasuryAddress("hardhat");
const GELATO_ADDRESS = getGelatoAddress("hardhat");
const AUTOMATE_ADDRESS = getAutomateAddress("hardhat");
const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ZERO_ADD = ethers.constants.AddressZero;
const FEE = ethers.utils.parseEther("0.1");


describe("USerCreator Gelato Time Task Tests WT", function () {
  this.timeout(0);

  let deployer: Signer;
  let deployerAddress: string;
  let executor: Signer;
  // let executorAddress: string;


  let taskTreasury: ITaskTreasuryUpgradable;
  let automate: IAutomate;
   let counter: CounterWT;
  let counterResolver: CounterResolverWT;
  let automateSDK: AutomateSDK;
  let taskId: string;
  let blockTime:number;

  before(async function () {
    await deployments.fixture();

    [deployer] = await ethers.getSigners();

    automate = await ethers.getContractAt("contracts/interfaces/IAutomate.sol:IAutomate", AUTOMATE_ADDRESS);
    taskTreasury = await ethers.getContractAt(
      "contracts/interfaces/ITaskTreasuryUpgradable.sol:ITaskTreasuryUpgradable",
      TASK_TREASURY_ADDRESS
    );

    console.log(" ");
    console.log("\x1b[32m%s\x1b[0m", "    ->", `\x1b[30mImpersonating Executor ${GELATO_ADDRESS}`);
    await impersonateAccount(GELATO_ADDRESS);
    executor = ethers.provider.getSigner(GELATO_ADDRESS);

    console.log("\x1b[32m%s\x1b[0m", "    ->", `\x1b[30mCreating the task`);
    console.log(" ");
    counter = await ethers.getContract("CounterWT", deployer);
    counterResolver = await ethers.getContract("CounterResolverWT", deployer);
    automateSDK = new AutomateSDK(1, deployer);


    const execSelector = await counter.interface.getSighash("increaseCount");
    blockTime = await getTimeStampNow()

    let task = await automateSDK.createTask({
      execAddress: counter.address,
      startTime:blockTime,
      interval:180,
      useTreasury: false,
      dedicatedMsgSender: true,
      name: "test",
      execSelector,
    });
    taskId = task.taskId!;
    deployerAddress = await deployer.getAddress();
   
  });

  it("It executes properly", async () => {
   
    const timeArgs = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [blockTime, 180]);

    let moduleData = {
      modules: [1, 2],
      args: [timeArgs, "0x"],
    };

    let feeToken = ETH;
    let selector = counter.interface.getSighash("increaseCount"); //counter.interface.getSighash("increaseCount");

    const calculatedTaskId = getTaskId(deployerAddress, counter.address, selector, moduleData, feeToken);

    expect(taskId).equal(calculatedTaskId);
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mTaksId correct`);

    const execData = await counter.interface.encodeFunctionData("increaseCount", [1]);

    //// EXECUTION
    await expect(
      automate.connect(executor).exec(deployerAddress, counter.address, execData, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      })
    ).to.be.revertedWith("Automate.exec: OpsProxy.executeCall: _transfer: ETH transfer failed");
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution reverted as expected wo funding the contract`);

    // DEPOSIT funds into the contract
    const depositAmount = ethers.utils.parseEther("100");
    await setBalance(counter.address, depositAmount);

    //// EXECUTION
    await automate
      .connect(executor)
      .exec(deployerAddress, counter.address, execData, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      });

    let counterNr = await counter.count();
    expect(+counterNr.toString()).to.equal(1);
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution successful increment +1`);

    await expect(
      automate.connect(executor).exec(deployerAddress, counter.address, execData, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      })
    ).to.be.revertedWith("Automate.preExecCall: TimeModule: Too early");
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution reverted as expected time not elapsed for second execution`);


    await fastForwardTime(180);
    await automate
      .connect(executor)
      .exec(deployerAddress, counter.address, execData, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      });

    counterNr = await counter.count();
    expect(+counterNr.toString()).to.equal(2);

    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution successful increment +2`);
  });
});
