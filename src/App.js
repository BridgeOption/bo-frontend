import React, { useState, createRef } from 'react'
import {
  Container,
  Dimmer,
  Loader,
  Grid,
  Sticky,
  Message,
  Dropdown,
} from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'

import { SubstrateContextProvider, useSubstrate } from './substrate-lib'
import { DeveloperConsole } from './substrate-lib/components'
import './app.css'

import AccountSelector from './AccountSelector'
import Balances from './Balances'
import BlockNumber from './BlockNumber'
import Events from './Events'
import Interactor from './Interactor'
import Metadata from './Metadata'
import NodeInfo from './NodeInfo'
import TemplateModule from './TemplateModule'
import Transfer from './Transfer'
import Upgrade from './Upgrade'
import BoModule from './BOModule'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import ProviderLiquidityModule from './ProviderLiquidityModule'

function Main() {
  const [accountAddress, setAccountAddress] = useState(null)
  const { apiState, keyring, keyringState, apiError } = useSubstrate()
  const [role, setRole] = React.useState(1)
  const accountPair =
    accountAddress &&
    keyringState === 'READY' &&
    keyring.getPair(accountAddress)

  const loader = text => (
    <Dimmer active>
      <Loader size="small">{text}</Loader>
    </Dimmer>
  )

  const message = err => (
    <Grid centered columns={2} padded>
      <Grid.Column>
        <Message
          negative
          compact
          floating
          header="Error Connecting to Substrate"
          content={`${JSON.stringify(err, null, 4)}`}
        />
      </Grid.Column>
    </Grid>
  )
  if (apiState === 'ERROR') return message(apiError)
  else if (apiState !== 'READY') return loader('Connecting to Substrate')

  if (keyringState !== 'READY') {
    return loader(
      "Loading accounts (please review any extension's authorization)"
    )
  }

  const contextRef = createRef()

  return (
    <div ref={contextRef} className="app">
      <Sticky context={contextRef}>
        <AccountSelector
          setAccountAddress={setAccountAddress}
          setRole={setRole}
          role={role}
        />
      </Sticky>
      <>
        {/* <> remove container */}
        <Grid stackable columns="equal" padded>
          {/* <Grid.Row stretched>
            <NodeInfo />
            <Metadata />
            <BlockNumber />
            <BlockNumber finalized />
          </Grid.Row>
          <Grid.Row stretched>
            <Balances />
          </Grid.Row>
          <Grid.Row>
            <Transfer accountPair={accountPair} />
            <Upgrade accountPair={accountPair} />
          </Grid.Row> */}
          {!role ? (
            <ProviderLiquidityModule accountPair={accountPair} />
          ) : (
            <BoModule accountPair={accountPair} />
          )}

          {/* <Grid.Row>
            <Interactor accountPair={accountPair} />
            <Events />
          </Grid.Row> */}
        </Grid>
      </>
      <DeveloperConsole />
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  )
}

export default function App() {
  return (
    <SubstrateContextProvider>
      <Main />
    </SubstrateContextProvider>
  )
}
