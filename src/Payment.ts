import { TLNetwork } from "./TLNetwork"

declare let lightwallet: any

export class Payment {

    constructor(private tlNetwork: TLNetwork) {
    }

    public mediatedTransfer(receiver: string, value: number): Promise<string> {
        const { user, transaction } = this.tlNetwork
        return this.getPath(user.address, receiver, value)
            .then((path) => {
                if (path.length > 0) {
                    return transaction.prepareTransaction(
                        "mediatedTransfer",
                        ["0x" + receiver, value, path.slice(1)]
                    )
                } else {
                    return Promise.reject<string>("Could not find a path with enough capacity")
                }
            })
            .then((tx) => user.signTx(tx))
            .then((tx) => transaction.relayTx(tx))
    }

    public getPath(accountA: string, accountB: string, value: number): Promise<string[]> {
        const { configuration, defaultNetwork } = this.tlNetwork
        return fetch(`${configuration.apiUrl}tokens/${defaultNetwork}/users/0x${accountA}/path/0x${accountB}/value/${value}`)
            .then((response) => response.json())
            .then((json) => json.path as string[])
            .catch(this.handleError)
    }

    private handleError(error: any) {
        return Promise.reject(error.json().message || error);
    }

}