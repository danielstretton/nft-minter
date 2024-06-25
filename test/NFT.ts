import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumberish, ContractFactory, Signer } from "ethers";
import { NFT } from "../typechain-types/NFT";

describe("NFT Contract", function () {
    let NFT: ContractFactory;
    let nft: NFT;
    let admin: Signer, admin2: Signer, addr1: Signer, addr2: Signer;
    let adminAddress: string,
        admin2Address: string,
        addr1Address: string,
        addr2Address: string;
    let mintPrice: BigNumberish;
    const baseTokenURI = "https://api.foo.bar/baz/";
    const updatedBaseTokenURI = "ipfs://updated_link_here/";
    const mintPriceEther = "0.001";
    const updatedMintPriceEther = "1";

    beforeEach(async function () {
        [admin, admin2, addr1, addr2] = await ethers.getSigners();

        adminAddress = await admin.getAddress();
        admin2Address = await admin2.getAddress();
        addr1Address = await addr1.getAddress();
        addr2Address = await addr2.getAddress();

        NFT = await ethers.getContractFactory("NFT");
        nft = (await NFT.deploy(
            "Avaxies",
            "AVAXIES",
            baseTokenURI,
            ethers.parseEther(mintPriceEther),
            10, // assuming max supply is 10 for the test
            adminAddress,
            admin2Address
        )) as NFT;
        await nft.waitForDeployment();

        mintPrice = await nft.price();
    });

    describe("Deployment", function () {
        it("deploys successfully", async function () {
            const address = await nft.getAddress();
            expect(address).to.not.equal("");
            expect(address).to.not.equal(0x0);
            expect(address).to.not.equal(null);
            expect(address).to.not.equal(undefined);
        });

        it("has a name", async function () {
            const name = await nft.name();
            expect(name).to.equal("Avaxies");
        });

        it("has a symbol", async function () {
            const symbol = await nft.symbol();
            expect(symbol).to.equal("AVAXIES");
        });

        it("has a base url", async function () {
            const baseUrl = await nft.getBaseURI();
            expect(baseUrl).to.equal(baseTokenURI);
        });

        it("can update base uri", async function () {
            await nft.connect(admin).setBaseURI(updatedBaseTokenURI);
            let baseUri = await nft.getBaseURI();
            expect(baseUri).to.equal(updatedBaseTokenURI);

            // Set base uri back to deployed value.
            await nft.connect(admin).setBaseURI(baseTokenURI);
            baseUri = await nft.getBaseURI();
            expect(baseUri).to.equal(baseTokenURI);
        });

        it("mint price is 0.001 ether", async function () {
            const price = ethers.formatEther(mintPrice);
            expect(price).to.equal(mintPriceEther);
        });

        it("can update price to 1 ether", async function () {
            await nft.setPrice(ethers.parseEther(updatedMintPriceEther));
            let newMintPrice = await nft.price();
            expect(newMintPrice).to.equal(ethers.parseEther("1"));

            // Set price back to deployed value.
            await nft.setPrice(ethers.parseEther(mintPriceEther));
            let updatedPrice = await nft.price();
            let newUpdatedPrice = ethers.formatEther(updatedPrice);
            expect(newUpdatedPrice).to.equal(mintPriceEther);
        });

        it("current rate is zero", async function () {
            const currentRate = await nft.currentRate();
            expect(currentRate).to.equal(0);
        });
    });

    describe("Minting", function () {
        it("can mint", async function () {
            // Mint NFT
            await addr1.sendTransaction({
                to: await nft.getAddress(),
                value: mintPrice,
                data: nft.interface.encodeFunctionData("mint", [1]),
            });

            // const tx = await nft.connect(addr1).mint(1, { value: mintPrice });
            // Check minter address
            const tokenMinter = await nft.tokenMinter(0);
            expect(tokenMinter).to.equal(addr1Address);

            // Check token uri
            const tokenUri = await nft.tokenURI(0);
            expect(tokenUri).to.equal(`${baseTokenURI}0`);

            // FAILURE: mint price must be quantity * price (0.001 ether)
            await expect(
                nft
                    .connect(addr1)
                    .mint(1, { value: ethers.parseEther("0.0001") })
            ).to.be.revertedWith("Avaxies: must send correct price");
            // FAILURE: cannot mint more than the total supply (10)
            await expect(
                nft.connect(addr1).mint(11, { value: BigInt(mintPrice) * 11n })
            ).to.be.revertedWith(
                "Avaxies: not enough avaxies left to mint amount"
            );
        });
    });

    it("can mint multiple quantities", async function () {
        const quantity = 3;
        await addr2.sendTransaction({
            to: await nft.getAddress(),
            value: BigInt(mintPrice) * BigInt(quantity),
            data: nft.interface.encodeFunctionData("mint", [quantity]),
        });

        // Loop through minted NFTs
        for (let i = 0; i < quantity; i++) {
            // Check minter address
            const tokenMinter = await nft.tokenMinter(i);
            expect(tokenMinter).to.equal(addr2Address);

            // Check token uri
            const tokenUri = await nft.tokenURI(i);
            expect(tokenUri).to.equal(`${baseTokenURI}${i}`);
        }

        // FAILURE: mint price must match amount to be minted
        await expect(
            nft.connect(addr2).mint(2, { value: mintPrice })
        ).to.be.revertedWith("Avaxies: must send correct price");
    });

    it("current rate now set", async function () {
        await addr1.sendTransaction({
            to: await nft.getAddress(),
            value: mintPrice,
            data: nft.interface.encodeFunctionData("mint", [1]),
        });
        const currentRate = await nft.currentRate();
        expect(currentRate).to.not.equal(0);
    });

    it("has balances to reflect", async function () {
        await addr1.sendTransaction({
            to: await nft.getAddress(),
            value: mintPrice,
            data: nft.interface.encodeFunctionData("mint", [1]),
        });

        await addr2.sendTransaction({
            to: await nft.getAddress(),
            value: BigInt(mintPrice) * BigInt(3),
            data: nft.interface.encodeFunctionData("mint", [3]),
        });

        let reflectiveBalance = await nft
            .connect(addr1)
            .getReflectionBalances();
        expect(reflectiveBalance).to.not.equal(0);

        reflectiveBalance = await nft.connect(addr2).getReflectionBalances();
        expect(reflectiveBalance).to.not.equal(0);
    });

    it("can reflect balance", async function () {
        await nft.connect(addr1).claimRewards();
        await nft.connect(addr2).claimRewards();

        let reflectiveBalance = await nft
            .connect(addr1)
            .getReflectionBalances();
        expect(reflectiveBalance).to.equal(0);

        reflectiveBalance = await nft.connect(addr2).getReflectionBalances();
        expect(reflectiveBalance).to.equal(0);
    });

    describe("Post Mint", function () {
        it("can transfer ownership", async function () {
            await addr1.sendTransaction({
                to: await nft.getAddress(),
                value: mintPrice,
                data: nft.interface.encodeFunctionData("mint", [1]),
            });

            await addr2.sendTransaction({
                to: await nft.getAddress(),
                value: BigInt(mintPrice) * BigInt(3),
                data: nft.interface.encodeFunctionData("mint", [3]),
            });
            // Approve contract for secondary sales
            await nft
                .connect(admin)
                .setApprovalForAll(await nft.getAddress(), true);

            const owner = await nft.ownerOf(0);
            await nft
                .connect(await ethers.getSigner(owner))
                .transferFrom(owner, addr2, 0);

            const originalMinter = await nft.tokenMinter(0);
            expect(originalMinter).to.equal(await addr1.getAddress());

            const newOwner = await nft.ownerOf(0);
            expect(newOwner).to.equal(await addr2.getAddress());
        });
    });
});
