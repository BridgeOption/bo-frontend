import React from 'react'
import * as LightweightCharts from 'lightweight-charts'
import { Grid, Form, Input, Dropdown, Feed } from 'semantic-ui-react'
import { useSubstrate } from './substrate-lib'
import { TxButton } from './substrate-lib/components'
import Events from './Events'
import PropTypes from 'prop-types'

import { toast } from 'react-toastify'

const t = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')
function Main(props) {
  const ref = React.useRef()
  const { api } = useSubstrate()
  const { accountPair } = props
  // The transaction submission status
  const [status, setStatus] = React.useState('')

  const [series, setSeries] = React.useState(null)
  const [betOrders, setBetOrders] = React.useState([])
  const [data, setData] = React.useState([])
  const [currentPrice, setCurrentPrice] = React.useState(100)
  const [optionsExpireAt, setOptionsExpireAt] = React.useState([])
  const [currentExpireAt, setCurrentExpireAt] = React.useState(
    optionsExpireAt[0]?.value
  )
  const [history, setHistory] = React.useState([])
  const [currentEvent, setCurrentEvent] = React.useState(null)

  const fetchHistoryData = async () => {
    const promise = await fetch(
      'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m'
    )
    const result = await promise.json()

    return result.map(item => ({
      time: item[0],
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      // value: item[5], // volume
      // color: item[4] < item[1] ? '#EF5350' : '#26a69a',
    }))
  }
  React.useEffect(() => {
    // set expire time
    const options = [
      {
        // 1 minute
        key: 60,
        text: `1 minute`,
        value: 60,
        image: null,
      },
      {
        // 3 minute
        key: 3 * 60,
        text: `3 minutes`,
        value: 3 * 60,
        image: null,
      },

      {
        // 5 minute
        key: 5 * 60,
        text: `5 minutes`,
        value: 5 * 60,
        image: null,
      },
    ]

    setOptionsExpireAt(options)
    setCurrentExpireAt(options[0].value)

    fetchHistoryData()
    const chart = LightweightCharts.createChart(ref.current, {
      width: ref.current.offsetWidth,
      height: 600,
      localization: {
        timeFormatter: time => {
          const date = new Date(time)
          const day = date.getDate()
          const month = date.getMonth() + 1
          const year = date.getFullYear()
          const hour = date.getHours()
          const minute = date.getMinutes()
          return `${day}/${month}/${year} ${hour}:${minute}`
        },
      },
      timeScale: {
        tickMarkFormatter: time => {
          const date = new Date(time)
          const hour = date.getHours()
          const minute = date.getMinutes()
          return `${hour}:${minute}`
        },
        timeVisible: true,
      },
    })
    const candleSeriesInit = chart.addCandlestickSeries()

    fetchHistoryData().then(d => {
      candleSeriesInit.setData(d)
      setData(d)
    })

    setSeries(candleSeriesInit)
    return () => t.close()
  }, [])

  React.useEffect(() => {
    t.onmessage = e => {
      const event = JSON.parse(e.data)
      const currentData = {
        time: event.E,
        open: event.k.o,
        high: event.k.h,
        low: event.k.l,
        close: event.k.c,
        // value: event.k.v,
        // color: event.k.c < event.k.o ? '#EF5350' : '#26a69a',
      }
      const currentBarMinute = new Date(event.E).getMinutes()
      const currentTimeMinute = new Date().getMinutes()
      if (currentBarMinute !== currentTimeMinute) {
        if (!series) {
          return
        }
        series.update(currentData)
        setData([...data, currentData])
      } else {
        if (!series) {
          return
        }
        if (data.length === 0) {
          setData([...data, currentData])
          return
        }
        const lastItemData = data[data.length - 1]
        if (lastItemData.time > currentData.time) {
          return
        }
        const barUpdated = {
          time: lastItemData.time,
          open: event.k.o,
          high: event.k.h,
          low: event.k.l,
          close: event.k.c,
        }
        series.update(barUpdated)
        setData(updateLastItemArray(data, barUpdated))

        const betOrdersUpdated = []
        const betOrdersEnded = []
        betOrders.forEach(item => {
          if (item.rangeTime === 0) {
            betOrdersEnded.push(item)
            return
          }
          const rangeTime = item.rangeTime - 2
          if (item.state === 'up') {
            const u = {
              ...item,
              rangeTime,
              marker: {
                ...item.marker,
                color: item.price > barUpdated.close ? '#f45353' : '#53f463',
                text: `@${item.state} ${Number(item.price)} | ${
                  item.price <= barUpdated.close
                    ? '+ ' + (0.95 * item.amount).toFixed(2) + '$'
                    : '- ' + item.amount + '$'
                } | Time: ${rangeTime}`,
              },
            }
            betOrdersUpdated.push(u)
            return
          }
          if (item.state === 'down') {
            const u = {
              ...item,
              rangeTime,
              marker: {
                ...item.marker,
                color: item.price < barUpdated.close ? '#f45353' : '#53f463',
                text: `@${item.state} ${Number(item.price)} | ${
                  item.price >= barUpdated.close
                    ? '+ ' + (0.95 * item.amount).toFixed(2) + '$'
                    : '- ' + item.amount + '$'
                } | Time: ${rangeTime}`,
              },
            }
            betOrdersUpdated.push(u)
            return
          }
        })
        series.setMarkers(betOrders.map(item => item.marker))
        setBetOrders(betOrdersUpdated)

        betOrdersEnded.forEach(item => {
          series.removePriceLine(item.priceLine)
        })
      }
    }
  }, [series, data, betOrders])

  // query history
  React.useEffect(() => {
    let unsub = null

    const allEvents = async () => {
      if (accountPair?.address) {
        const userOrders = await api.query.boTradingModule.userOrders(
          accountPair?.address
        )
        const orders = await api.query.boTradingModule.orders.multi(
          userOrders.toHuman()
        )
        const newHistory = []
        orders.forEach((order, index) => {
          const {
            tradeType,
            volumeInUnit,
            openPrice,
            payoutRate,
            status,
            closePrice,
          } = order.toHuman()
          const h = {
            key: index,
            status,
            summary: `${tradeType} - amount: $${volumeInUnit.replace(
              ',000,000,000,000',
              ''
            )} - Status: ${status === 'Created' ? 'Pending' : status}`,
            content: `Open price: ${openPrice} cents - Close price: ${
              !closePrice ? '--' : closePrice
            } cents - pay out rate: ${payoutRate}%`,
          }
          newHistory.push(h)
        })

        setHistory(newHistory.reverse())
      }
    }

    allEvents()
    return () => unsub && unsub()
  }, [api.query.boTradingModule, history, accountPair])

  React.useEffect(() => {
    if (currentEvent && currentEvent.section === 'boTradingModule') {
      if (currentEvent.method === 'OrderCreated') {
        toast.info('Order successfully!')
      }
      if (currentEvent.method === 'OrderClosed') {
        if (currentEvent.data[3] === 'Lose') {
          toast.error('Lose')
        }
        if (currentEvent.data[3] === 'Win') {
          toast.success('Win')
        }
      }
    }
  }, [currentEvent])
  // s???a ph???n t??? cu???i c??ng
  const updateLastItemArray = (array, newItem) => {
    array.pop()
    array.push(newItem)
    return array
  }

  const betAdd = amount => {
    const lastData = data[data.length - 1]
    const marker = {
      time: lastData.time,
      position: 'aboveBar',
      color: '#d1d4dc',
      shape: 'arrowDown',
      text: `@up ${Number(lastData.close)} | Time: ${currentExpireAt}`,
    }

    const optionPriceLine = {
      price: lastData.close,
      color: '#d1d4dc',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: '@Up',
    }
    const line = series.createPriceLine(optionPriceLine)
    const newBetOrders = [
      ...betOrders,
      {
        amount: amount,
        rangeTime: currentExpireAt,
        price: lastData.close,
        state: 'up',
        priceLine: line,
        marker,
      },
    ]
    setBetOrders(newBetOrders)
    series.setMarkers(newBetOrders.map(item => item.marker))
  }

  const betDown = amount => {
    const lastData = data[data.length - 1]
    const marker = {
      time: lastData.time,
      position: 'belowBar',
      color: '#d1d4dc',
      shape: 'arrowUp',
      text: `@down ${Number(lastData.close)} | Time: ${currentExpireAt}`,
    }

    const optionPriceLine = {
      price: lastData.close,
      color: '#d1d4dc',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: '@Down',
    }
    const line = series.createPriceLine(optionPriceLine)
    const newBetOrders = [
      ...betOrders,
      {
        amount: amount,
        rangeTime: currentExpireAt,
        price: lastData.close,
        state: 'down',
        priceLine: line,
        marker,
      },
    ]
    setBetOrders(newBetOrders)
    series.setMarkers(newBetOrders.map(item => item.marker))
  }

  const getNextTime = seconds => {
    const now = Date.now()
    const unitCurrentTime = Math.floor(now / 1000)
    return unitCurrentTime + seconds
  }

  return (
    <>
      <Grid.Row style={{ display: props.role ? '' : 'none' }}>
        <Grid.Column width={3}>
          <Events emitEvent={event => setCurrentEvent(event)} />
        </Grid.Column>
        <Grid.Column width={10}>
          <div ref={ref} style={{ position: 'relative' }}></div>
        </Grid.Column>
        <Grid.Column width={3}>
          <h1 style={{ float: 'left' }}>Trade</h1>
          <Form>
            <Form.Field>
              <label>Amount</label>
              <Input
                state="currentPrice"
                type="number"
                icon="dollar"
                value={currentPrice}
                onChange={(_, { value }) => setCurrentPrice(value)}
              />
            </Form.Field>
            <Form.Field>
              <label>Time</label>
              <Dropdown
                selection
                options={optionsExpireAt}
                defaultValue={currentExpireAt}
                value={currentExpireAt}
                onChange={(_, { value }) => setCurrentExpireAt(value)}
              />
            </Form.Field>
            <Form.Field style={{ textAlign: 'center' }}>
              <TxButton
                accountPair={accountPair}
                attrsButton={{ fluid: true }}
                color="green"
                label="CALL"
                type="SIGNED-TX"
                setStatus={status => {
                  if (status === 'InBlock') {
                    betAdd(currentPrice)
                  }

                  setStatus(status)
                }}
                attrs={{
                  palletRpc: 'boTradingModule',
                  callable: 'placeOrder',
                  inputParams: [
                    'BtcUsdt',
                    'Call',
                    currentPrice + '000000000000',
                    getNextTime(currentExpireAt + 18),
                  ],
                  paramFields: [true, true, true, true],
                }}
              />
            </Form.Field>
            <Form.Field style={{ textAlign: 'center' }}>
              <TxButton
                accountPair={accountPair}
                attrsButton={{ fluid: true }}
                color="red"
                label="PUT"
                type="SIGNED-TX"
                setStatus={status => {
                  if (status === 'InBlock') {
                    betDown(currentPrice)
                  }
                  setStatus(status)
                }}
                attrs={{
                  palletRpc: 'boTradingModule',
                  callable: 'placeOrder',
                  inputParams: [
                    'BtcUsdt',
                    'Put',
                    currentPrice + '000000000000',
                    getNextTime(currentExpireAt + 18),
                  ],
                  paramFields: [true, true, true, true],
                }}
              />
            </Form.Field>
            <div style={{ overflowWrap: 'break-word' }}>{status}</div>
          </Form>
          {/* <Events /> */}
          <Grid.Column width={3}>
            <h1 style={{ float: 'left' }}>History</h1>
            <Feed
              style={{
                clear: 'both',
                overflow: 'auto',
                maxHeight: 240,
              }}
            >
              {history.map((item, index) => {
                const colorFeed = status => {
                  switch (status) {
                    case 'Win':
                      return '#21BA45'
                    case 'Lose':
                      return '#DB2828'
                    default:
                      return ''
                  }
                }
                const color = colorFeed(item.status)
                return (
                  <Feed.Event key={index}>
                    <Feed.Content>
                      <Feed.Summary>
                        <span
                          style={{
                            color: color,
                          }}
                        >
                          {item.summary}
                        </span>
                      </Feed.Summary>
                      <Feed.Extra>{item.content}</Feed.Extra>
                    </Feed.Content>
                  </Feed.Event>
                )
              })}
            </Feed>
          </Grid.Column>
        </Grid.Column>
      </Grid.Row>
    </>
  )
}

export default function BOModule(props) {
  const { api } = useSubstrate()
  return api.query.boTradingModule ? <Main {...props} /> : null
}
