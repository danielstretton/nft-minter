import { Box, Flex, Heading } from "@radix-ui/themes";
import WalletConnection from "./WalletConnection";
import { BrowserProvider } from "ethers";

const NavBar = ({
    setProvider,
    setAccount,
    setSigner,
    setChainId,
    chainId,
    account,
}: {
    setProvider: (provider: BrowserProvider | null) => void;
    setAccount: (account: string | null) => void;
    setSigner: (signer: string | null) => void;
    setChainId: (chainId: number | null) => void;
    chainId: number | null;
    account: string | null;
}) => {
    return (
        <Flex justify="between" pt="5" pb="5">
            <Box>
                <Heading as="h1">Avaxies - NFT Minter</Heading>
            </Box>
            <Box>
                <WalletConnection
                    setProvider={setProvider}
                    setAccount={setAccount}
                    setSigner={setSigner}
                    setChainId={setChainId}
                    chainId={chainId}
                    account={account}
                />
            </Box>
        </Flex>
    );
};

export default NavBar;
