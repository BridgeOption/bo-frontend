import React from 'react'
import * as LightweightCharts from 'lightweight-charts'

const t = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')
function App() {
  const ref = React.useRef()

  const [series, setSeries] = React.useState(null)
  const [betOrders, setBetOrders] = React.useState([])
  const [data, setData] = React.useState([])
  const [priceBet, setPriceBet] = React.useState(1)
  const [totalMoney, setTotalMoney] = React.useState(10000)
  const [nextMinute, setNextMinute] = React.useState()

  React.useEffect(() => {
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
    const seriesInit = chart.addCandlestickSeries()
    seriesInit.setData(data)
    // seriesInit.setMarkers(markers);
    setSeries(seriesInit)
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

  // React.useEffect(() => {

  //         const betOrdersUpdated = [];
  //         betOrders.forEach((item) => {

  //         });
  //         series.setMarkers(betOrders.map((item) => item.marker));
  //         setBetOrders(betOrdersUpdated);

  // }, [betOrders, series]);

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
    <div>
      <div ref={ref} style={{ position: 'relative' }}></div>
      <div>{totalMoney}</div>
      <input
        type="text"
        value={priceBet}
        onChange={e => {
          setPriceBet(Number(e.currentTarget.value))
        }}
      />
      <button onClick={() => betAdd()}>Tăng</button>
      <button onClick={() => betDown()}>Giảm</button>
    </div>
  )
}

export default App
