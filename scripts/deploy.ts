// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  // mocks

  const deployerAmt = BigNumber.from("1000000000000"); //1000k USDC
  const lenderAmt = BigNumber.from("200000000000"); //200k USDC
  const borrowedAmt = BigNumber.from("100000000000"); //100k USDC
  const initialBorrowerAmt = BigNumber.from("100000000000"); //100k USDC
  const rate = BigNumber.from(10);
  const duration = BigNumber.from("315360000"); //In seconds
  const collateral = "100.00"; //In Eth
  const ethPrice = "300000000000"; // 3k USDC

  const [deployer, lender, borrower] = await ethers.getSigners();

  //deploying USDC
  let tx1 = await ethers.getContractFactory("USDC");
  const USDC = await tx1.deploy(deployerAmt);
  await USDC.deployed();

  //deploying mock pricefeed
  let tx2 = await ethers.getContractFactory("MockV3Aggregator");
  const MockPriceFeed = await tx2.deploy(18, BigNumber.from(ethPrice));
  await MockPriceFeed.deployed();

  //deploy Annuity
  let tx4 = await ethers.getContractFactory("Annuity");
  const Annuity = await tx4.deploy(USDC.address, MockPriceFeed.address);
  await Annuity.deployed();

  //deployer transfer money to lender
  let tx5 = await USDC.connect(deployer).transfer(lender.address, lenderAmt);
  await tx5.wait();
  //deployer transfer money to borrower
  let tx6 = await USDC.connect(deployer).transfer(
    lender.address,
    initialBorrowerAmt
  );
  await tx6.wait();

  //print initial balance of lender and borrower
  console.log(
    "Before borrow balance of lender is %d and balance of borrower is %d",
    await USDC.balanceOf(lender.address),
    await USDC.balanceOf(borrower.address)
  );

  //lender approves borrowerAmt USDC to Annuity contract
  tx5 = await USDC.connect(lender).approve(Annuity.address, borrowedAmt);
  tx5.wait();

  //lender creates a agreement
  tx5 = await Annuity.connect(lender).createAgreement(
    rate,
    duration,
    borrowedAmt
  );
  await tx5.wait();

  //borrower borrow the agreement
  tx5 = await Annuity.connect(borrower).borrow(
    1,
    ethers.utils.parseEther(collateral),
    { value: ethers.utils.parseEther(collateral) }
  );
  let temp = await tx5.wait();
  console.log("Borrower provided %d Eths as collateral", collateral);

  //print updated balance of lender and borrower
  console.log(
    "After borrow balance of lender is %d and balance of borrower is %d",
    await USDC.balanceOf(lender.address),
    await USDC.balanceOf(borrower.address)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
