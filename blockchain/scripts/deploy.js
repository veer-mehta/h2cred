async function main() 
{
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const HydrogenCredit = await ethers.getContractFactory("HydrogenCredit");
    const contract = await HydrogenCredit.deploy();

    await contract.deployed();

    console.log("HydrogenCredit deployed to:", contract.address);
}

main().catch((error) => 
{
    console.error(error);
    process.exitCode = 1;
});

// deploys the smart contract to sepolia testnet with my credentials and some eth to mine the contract