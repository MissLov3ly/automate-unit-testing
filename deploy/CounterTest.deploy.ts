import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getAutomateAddress } from "../hardhat/config/addresses";

const Automate = getAutomateAddress("mainnet");

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (hre.network.name !== "hardhat") {
    console.log(`Deploying CounterTest to ${hre.network.name}. Hit ctrl + c to abort`);
  }

  const { deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await hre.getNamedAccounts();

  //// Contract Creator / Without Treasury
  await deploy("CounterResolverTaskCreatorWT", {
    from: deployer,
    args: [Automate, deployer],
  });

  await deploy("CounterSingleExecTaskCreatorWT", {
    from: deployer,
    args: [Automate, deployer],
  });

  await deploy("CounterTimeTaskCreatorWT", {
    from: deployer,
    args: [Automate, deployer],
  });

  //// Contract Creator / With Treasury
  await deploy("CounterResolverTaskCreator", {
    from: deployer,
    args: [Automate, deployer],
  });

  await deploy("CounterSingleExecTaskCreator", {
    from: deployer,
    args: [Automate, deployer],
  });

  await deploy("CounterTimeTaskCreator", {
    from: deployer,
    args: [Automate, deployer],
  });

    //// User Creator / Without Treasury

  let counterWT = await deploy("CounterWT", {
    from: deployer,
    args: [Automate, deployer],
  });

  await deploy("CounterResolverWT", {
    from: deployer,
    args: [counterWT.address],
  });

     //// User Creator / With Treasury

     let counter = await deploy("Counter", {
      from: deployer,
      args: [Automate, deployer],
    });
  
    await deploy("CounterResolver", {
      from: deployer,
      args: [counter.address],
    });


};

export default func;

func.skip = async (hre: HardhatRuntimeEnvironment) => {
  const shouldSkip = hre.network.name !== "hardhat";
  return shouldSkip;
};

func.tags = [
  "CounterTest",
  "CounterResolverTaskCreatorWT",
  "CounterSingleExecTaskCreatorWT",
  "CounterTimeTaskCreatorWT",
  "CounterResolverTaskCreator",
  "CounterSingleExecTaskCreator",
  "CounterTimeTaskCreator",
];
