import React, { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import {
  Menu,
  Button,
  Dropdown,
  Container,
  Icon,
  Image,
  Label,
} from 'semantic-ui-react'

import { useSubstrate } from './substrate-lib'

function Main(props) {
  const { keyring } = useSubstrate()
  const { setAccountAddress } = props
  const [accountSelected, setAccountSelected] = useState('')

  // Get the list of accounts we possess the private key for
  const keyringOptions = keyring.getPairs().map(account => ({
    key: account.address,
    value: account.address,
    text: account.meta.name.toUpperCase(),
    icon: 'user',
  }))

  const initialAddress =
    keyringOptions.length > 0 ? keyringOptions[0].value : ''

  // Set the initial address
  useEffect(() => {
    setAccountAddress(initialAddress)
    setAccountSelected(initialAddress)
  }, [setAccountAddress, initialAddress])

  const onChange = address => {
    // Update state with new account address
    setAccountAddress(address)
    setAccountSelected(address)
  }
  const optionsRole = [
    {
      //provider
      key: 'provider',
      text: `Provider`,
      value: 0,
      image: null,
    },
    {
      //player
      key: 'player',
      text: `Player`,
      value: 1,
      image: null,
    },
  ]

  return (
    <Menu
      attached="top"
      tabular
      style={{
        backgroundColor: '#fff',
        borderColor: '#fff',
        padding: '1em',
      }}
    >
      <>
        {/* remove container */}
        <Menu.Menu>
          <Image
            src={`${process.env.PUBLIC_URL}/assets/substrate-logo.png`}
            size="mini"
          />
        </Menu.Menu>
        <Menu.Menu position="right" style={{ alignItems: 'center' }}>
          <Dropdown
            selection
            options={optionsRole}
            value={props.role}
            onChange={(_, { value }) => props.setRole(value)}
            style={{ marginRight: '1rem' }}
          />
          {!accountSelected ? (
            <span>
              Add your account with the{' '}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/polkadot-js/extension"
              >
                Polkadot JS Extension
              </a>
            </span>
          ) : null}
          <CopyToClipboard text={accountSelected}>
            <Button
              basic
              circular
              size="large"
              icon="user"
              color={accountSelected ? 'green' : 'red'}
            />
          </CopyToClipboard>
          <Dropdown
            search
            selection
            clearable
            placeholder="Select an account"
            options={keyringOptions}
            onChange={(_, dropdown) => {
              onChange(dropdown.value)
            }}
            value={accountSelected}
          />
          <BalanceAnnotation accountSelected={accountSelected} />
        </Menu.Menu>
      </>
    </Menu>
  )
}

function BalanceAnnotation(props) {
  const { accountSelected } = props
  const { api } = useSubstrate()
  const [accountBalance, setAccountBalance] = useState(0)

  // When account address changes, update subscriptions
  useEffect(() => {
    let unsubscribe

    // If the user has selected an address, create a new subscription
    accountSelected &&
      api.query.system
        .account(accountSelected, balance => {
          setAccountBalance(balance.data.free.toHuman())
        })
        .then(unsub => {
          unsubscribe = unsub
        })
        .catch(console.error)

    return () => unsubscribe && unsubscribe()
  }, [api, accountSelected])

  return accountSelected ? (
    <Label pointing="left">
      <Icon name="money" color="green" />
      {accountBalance}
    </Label>
  ) : null
}

export default function AccountSelector(props) {
  const { api, keyring } = useSubstrate()
  return keyring.getPairs && api.query ? <Main {...props} /> : null
}
