/* eslint-disable @typescript-eslint/no-explicit-any */
import { Signer } from "@ethersproject/abstract-signer";
import { expect } from "chai";
import hre = require("hardhat");

import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";

import { getAutomateAddress, getGelatoAddress, getTreasuryAddress } from "../../../hardhat/config/addresses";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";
const { ethers, deployments } = hre;
import {
  ITaskTreasuryUpgradable,
  IAutomate,
  CounterResolverTaskCreatorWT,
  CounterResolverWT,
  CounterWT,
} from "../../../typechain";
import { fastForwardTime, getTaskId, getTimeStampNow, Module } from "../../utils";

const TASK_TREASURY_ADDRESS = getTreasuryAddress("hardhat");
const GELATO_ADDRESS = getGelatoAddress("hardhat");
const AUTOMATE_ADDRESS = getAutomateAddress("hardhat");
const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ZERO_ADD = ethers.constants.AddressZero;
const FEE = ethers.utils.parseEther("0.1");
const INTERVAL = 180;

describe("UserCreator Gelato Automate Resolver Contract WT", function () {
  this.timeout(0);

  let deployer: Signer;
  let deployerAddress: string;

  let executor: Signer;

  let taskTreasury: ITaskTreasuryUpgradable;
  let automate: IAutomate;
  let counter: CounterWT;
  let counterResolver: CounterResolverWT;
  let automateSDK: AutomateSDK;
  let taskId: string;

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

    const resolverData = counterResolver.interface.encodeFunctionData("checker");
    const execSelector = await counter.interface.getSighash("increaseCount");

    let task = await automateSDK.createTask({
      execAddress: counter.address,
      resolverAddress: counterResolver.address,
      resolverData,
      useTreasury: false,
      dedicatedMsgSender: true,
      name: "test",
      execSelector,
    });
    taskId = task.taskId!;
  });

  it("It executes properly", async () => {
    const resolverData = counterResolver.interface.encodeFunctionData("checker");
    const resolverArgs = ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [counterResolver.address, resolverData]
    );

    let moduleData = {
      modules: [Module.RESOLVER, Module.PROXY],
      args: [resolverArgs, "0x"],
    };

    let feeToken = ETH;
    let selector = counter.interface.getSighash("increaseCount");

    deployerAddress = await deployer.getAddress();
    const calculatedTaskId = getTaskId(deployerAddress, counter.address, selector, moduleData, feeToken);

    expect(calculatedTaskId).to.equal(taskId);
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mTaksId correct`);

    const check1 = await counterResolver.checker();
    expect(check1.canExec).true;
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mCanExec = true`);

    // Execution Reverted without funding the contract
    await expect(
      automate
        .connect(executor)
        .exec(deployerAddress, counter.address, check1.execPayload, moduleData, FEE, ETH, false, true, {
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
      .exec(deployerAddress, counter.address, check1.execPayload, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      });

    const counterNr = await counter.count();
    expect(+counterNr.toString()).to.equal(1);
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution successful increment +1`);

    const check2 = await counterResolver.checker();
    expect(check2.canExec).false;
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mTime not elapsed, not yet ready`);

    await fastForwardTime(INTERVAL + 1);

    const check3 = await counterResolver.checker();
    expect(check3.canExec).true;
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mREady to Execute after time ellapsed`);
    console.log(" ");
  });
});
