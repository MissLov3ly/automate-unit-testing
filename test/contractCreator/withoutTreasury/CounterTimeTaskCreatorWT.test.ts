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
} from "../../../typechain";
import { fastForwardTime, getTaskId, getTimeStampNow, Module } from "../../utils";
import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";

const TASK_TREASURY_ADDRESS = getTreasuryAddress("hardhat");
const GELATO_ADDRESS = getGelatoAddress("hardhat");
const AUTOMATE_ADDRESS = getAutomateAddress("hardhat");
const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ZERO_ADD = ethers.constants.AddressZero;
const FEE = ethers.utils.parseEther("0.1");


describe("ContactCreator Gelato Time Task Tests WT", function () {
  this.timeout(0);

  let user: Signer;
  let executor: Signer;
  // let executorAddress: string;


  let taskTreasury: ITaskTreasuryUpgradable;
  let automate: IAutomate;
  let counter: CounterResolverTaskCreatorWT;
  const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  before(async function () {
    await deployments.fixture();

    [, user] = await ethers.getSigners();

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
    counter = await ethers.getContract("CounterTimeTaskCreatorWT", user);
    await counter.createTask();
  });

  it("It executes properly", async () => {
    let taskId = await counter.taskId();

    const timestamp = await getTimeStampNow();

    const timeArgs = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [timestamp, 180]);

    let moduleData = {
      modules: [1, 2],
      args: [timeArgs, "0x"],
    };

    let feeToken = ETH;
    let selector = counter.interface.getSighash("increaseCount"); //counter.interface.getSighash("increaseCount");

    const calculatedTaskId = getTaskId(counter.address, counter.address, selector, moduleData, feeToken);

    expect(taskId).equal(calculatedTaskId);
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mTaksId correct`);

    const execData = await counter.interface.encodeFunctionData("increaseCount", [1]);

    //// EXECUTION
    await expect(
      automate.connect(executor).exec(counter.address, counter.address, execData, moduleData, FEE, ETH, false, true, {
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
      .exec(counter.address, counter.address, execData, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      });

    let counterNr = await counter.count();
    expect(+counterNr.toString()).to.equal(1);
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution successful increment +1`);

    await expect(
      automate.connect(executor).exec(counter.address, counter.address, execData, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      })
    ).to.be.revertedWith("Automate.preExecCall: TimeModule: Too early");
    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution reverted as expected time not elapsed for second execution`);


    await fastForwardTime(180);
    await automate
      .connect(executor)
      .exec(counter.address, counter.address, execData, moduleData, FEE, ETH, false, true, {
        gasLimit: 1_000_000,
      });

    counterNr = await counter.count();
    expect(+counterNr.toString()).to.equal(2);

    console.log("\x1b[32m%s\x1b[0m", "    ✔", `\x1b[30mExecution successful increment +2`);
  });
});
