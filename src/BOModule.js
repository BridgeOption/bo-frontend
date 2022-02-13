import React from 'react'
import * as LightweightCharts from 'lightweight-charts'
import { Grid, Form, Input } from 'semantic-ui-react'
import { useSubstrate } from './substrate-lib'
import { TxButton } from './substrate-lib/components'
import Events from './Events'

const t = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')
function Main(props) {
  const ref = React.useRef()
  const { api } = useSubstrate()
  const { accountPair } = props
  const [currentValue, setCurrentValue] = React.useState(0)
  const [formValue, setFormValue] = React.useState(0)
  // The transaction submission status
  const [status, setStatus] = React.useState('')

  const [series, setSeries] = React.useState(null)
  const [betOrders, setBetOrders] = React.useState([])
  const [data, setData] = React.useState([])
  const [priceBet, setPriceBet] = React.useState(1)

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
    fetchHistoryData()
    const chart = LightweightCharts.createChart(ref.current, {
      width: 1000,
      height: 500,
      layout: {
        textColor: '#d1d4dc',
        backgroundColor: '#000000',
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0)',
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0)',
        },
      },
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
                text: `@${item.state} ${item.price} | Time: ${rangeTime}`,
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
                text: `@${item.state} ${item.price} | Time: ${rangeTime}`,
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

  React.useEffect(() => {
    let unsubscribe
    api.query.templateModule
      .something(newValue => {
        // The storage value is an Option<u32>
        // So we have to check whether it is None first
        // There is also unwrapOr
        if (newValue.isNone) {
          setCurrentValue('<None>')
        } else {
          setCurrentValue(newValue.unwrap().toNumber())
        }
      })
      .then(unsub => {
        unsubscribe = unsub
      })
      .catch(console.error)

    return () => unsubscribe && unsubscribe()
  }, [api.query.templateModule])

  // sửa phần tử cuối cùng
  const updateLastItemArray = (array, newItem) => {
    array.pop()
    array.push(newItem)
    return array
  }

  const betAdd = () => {
    const lastData = data[data.length - 1]
    const marker = {
      time: lastData.time,
      position: 'aboveBar',
      color: '#d1d4dc',
      shape: 'arrowDown',
      text: `@up ${lastData.close} | Time: 300`,
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
        rangeTime: 300,
        price: lastData.close,
        state: 'up',
        priceLine: line,
        marker,
      },
    ]
    setBetOrders(newBetOrders)
    series.setMarkers(newBetOrders.map(item => item.marker))
  }

  const betDown = () => {
    const lastData = data[data.length - 1]
    const marker = {
      time: lastData.time,
      position: 'belowBar',
      color: '#d1d4dc',
      shape: 'arrowUp',
      text: `@down ${lastData.close} | Time: 300`,
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
        rangeTime: 300,
        price: lastData.close,
        state: 'down',
        priceLine: line,
        marker,
      },
    ]
    setBetOrders(newBetOrders)
    series.setMarkers(newBetOrders.map(item => item.marker))
  }

  return (
    <>
      <Grid.Row>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <div ref={ref} style={{ position: 'relative' }}></div>
        </div>
      </Grid.Row>
      <Grid.Row>
        <Grid.Column width={8}>
          <h1 style={{ float: 'left' }}>Trade</h1>
          <Form>
            <Form.Field>
              <Input
                label="New Value"
                state="newValue"
                type="number"
                onChange={(_, { value }) => setFormValue(value)}
              />
            </Form.Field>
            <Form.Field style={{ textAlign: 'center' }}>
              <TxButton
                accountPair={accountPair}
                label="Store Something"
                type="SIGNED-TX"
                setStatus={setStatus}
                attrs={{
                  palletRpc: 'templateModule',
                  callable: 'doSomething',
                  inputParams: [formValue],
                  paramFields: [true],
                }}
              />
            </Form.Field>
            <div style={{ overflowWrap: 'break-word' }}>{status}</div>
          </Form>
        </Grid.Column>
        <Events />
      </Grid.Row>
      {/* <div>{totalMoney}</div>
      <input
        type="text"
        value={priceBet}
        onChange={e => {
          setPriceBet(Number(e.currentTarget.value))
        }}
      />
      <button onClick={() => betAdd()}>Tăng</button>
      <button onClick={() => betDown()}>Giảm</button> */}
    </>
  )
}

export default function BOModule(props) {
  const { api } = useSubstrate()
  return api.query.templateModule && api.query.templateModule.something ? (
    <Main {...props} />
  ) : null
}
