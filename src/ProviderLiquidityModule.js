import React, { useEffect, useState } from 'react'
import { Feed, Grid, Button, Input, Form, Dropdown } from 'semantic-ui-react'
import PropTypes from 'prop-types'

import { useSubstrate } from './substrate-lib'
import { TxButton } from './substrate-lib/components'
import Events from './Events'
import { toast } from 'react-toastify'
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
  const [currentEvent, setCurrentEvent] = React.useState(null)

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
  React.useEffect(() => {
    if (currentEvent && currentEvent.section === 'boLiquidityModule') {
      if (currentEvent.method === 'LPCreated') {
        toast.success('Created pool successfully.')
      }

      if (currentEvent.method === 'LPDeposit') {
        toast.success('Deposited pool successfully.')
      }
    }
  }, [currentEvent])

  const { feedMaxHeight = 250 } = props

  return (
    <>
      <Grid.Row style={{ display: !props.role ? '' : 'none' }}>
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
              content: `volume: $${item.amount.replace(
                ',000,000,000,000',
                ''
              )} - pay out rate: ${item.payoutRate}%`,
            }))}
          />
          <Events emitEvent={event => setCurrentEvent(event)} />
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
                  inputParams: [name, payOutRate, amount + '000000000000'],
                  paramFields: [true, true, true],
                }}
              />
            </Form.Field>
            {status}
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
                  inputParams: [currentPool, amountDeposit + '000000000000'],
                  paramFields: [true, true],
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
