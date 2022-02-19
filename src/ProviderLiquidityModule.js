import React, { useEffect, useState } from 'react'
import { Feed, Grid, Button, Input, Form, Dropdown } from 'semantic-ui-react'
import PropTypes from 'prop-types'

import { useSubstrate } from './substrate-lib'
import { TxButton } from './substrate-lib/components'
// Events to be filtered from feed

function Main(props) {
  const { api } = useSubstrate()
  const { accountPair } = props
  const [name, setName] = React.useState('')
  const [amount, setAmount] = React.useState(0)
  const [amountDeposit, setAmountDeposit] = React.useState(0)
  const [payOutRate, setPayOutRate] = React.useState(0)
  const [listPool, setListPool] = React.useState([])
  const [currentPool, setCurrentPool] = React.useState('')
  const [status, setStatus] = React.useState('')

  React.useEffect(() => {
    let unsub = null

    const allEvents = async () => {
      const listPoolRaw =
        await api.query.boLiquidityModule.liquidityPools.entries()
      const pools = []
      listPoolRaw.forEach(pool => {
        const { name, amount, payoutRate, id } = pool[1].toHuman()

        const p = {
          id: id,
          name: name,
          amount: amount,
          payoutRate: payoutRate,
        }
        pools.push(p)
      })

      setListPool(pools)
    }

    allEvents()
    return () => unsub && unsub()
  }, [api.query.boLiquidityModule, listPool])

  const { feedMaxHeight = 250 } = props

  return (
    <>
      <Grid.Row>
        <Grid.Column>
          <h1 style={{ float: 'left' }}>List pool</h1>
          <Feed
            style={{
              clear: 'both',
              overflow: 'auto',
              maxHeight: feedMaxHeight,
            }}
            events={listPool.map((item, index) => ({
              key: index,
              summary: `Name: ${item.name}`,
              content: `volume: ${item.amount} - pay out rate: ${item.payoutRate}%`,
            }))}
          />
        </Grid.Column>
        <Grid.Column>
          <h1 style={{ float: 'left' }}>Create pool</h1>
          <Form>
            <Form.Field>
              <label>Name pool</label>
              <Input
                type="text"
                value={name}
                onChange={(_, { value }) => setName(value)}
              />
            </Form.Field>
            <Form.Field>
              <label>Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(_, { value }) => setAmount(value)}
              />
            </Form.Field>
            <Form.Field>
              <label>Pay out rate</label>
              <Input
                type="number"
                value={payOutRate}
                onChange={(_, { value }) => setPayOutRate(value)}
              />
            </Form.Field>
            <Form.Field style={{ textAlign: 'center' }}>
              <TxButton
                accountPair={accountPair}
                label="Create pool"
                type="SIGNED-TX"
                setStatus={setStatus}
                attrs={{
                  palletRpc: 'boLiquidityModule',
                  callable: 'createLp',
                  inputParams: [name, payOutRate, amount],
                  paramFields: [
                    PropTypes.string,
                    PropTypes.number,
                    PropTypes.number,
                  ],
                }}
              />
            </Form.Field>
          </Form>
        </Grid.Column>
        <Grid.Column>
          <h1 style={{ float: 'left' }}>Deposit available pool</h1>
          <Form>
            <Form.Field>
              <label>Select pool</label>
              <Dropdown
                selection
                options={listPool.map(item => {
                  return {
                    // 1 minute
                    key: item.id,
                    text: item.name,
                    value: item.id,
                    image: null,
                  }
                })}
                value={currentPool}
                onChange={(_, { value }) => setCurrentPool(value)}
              />
            </Form.Field>
            <Form.Field>
              <label>Amount</label>
              <Input
                type="number"
                value={amountDeposit}
                onChange={(_, { value }) => setAmountDeposit(value)}
              />
            </Form.Field>

            <Form.Field style={{ textAlign: 'center' }}>
              <TxButton
                accountPair={accountPair}
                label="Deposit pool"
                type="SIGNED-TX"
                setStatus={setStatus}
                attrs={{
                  palletRpc: 'boLiquidityModule',
                  callable: 'depositLp',
                  inputParams: [currentPool, amountDeposit],
                  paramFields: [PropTypes.string, PropTypes.number],
                }}
              />
            </Form.Field>
          </Form>
        </Grid.Column>
      </Grid.Row>
    </>
  )
}

export default function ProviderLiquidityModule(props) {
  const { api } = useSubstrate()
  return api.query && api.query.boLiquidityModule ? <Main {...props} /> : null
}
