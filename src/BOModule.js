import React from 'react'
import * as LightweightCharts from 'lightweight-charts'

const t = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')
function App() {
  const ref = React.useRef()

  const [series, setSeries] = React.useState(null)
  const [priceLines, setPriceLines] = React.useState([])
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

        const newPriceLines = []
        priceLines.forEach(item => {
          // lay lai cai thuoc tinh da set ban dau
          let optionPriceLine = item.priceLine.Ia.ki
          const timeRemaining = timeRemain(item.betTime)
          if (item.state === 'up') {
            optionPriceLine = {
              ...optionPriceLine,
              // color: optionPriceLine.price > barUpdated.close ? "#f45353" : "#53f463",
            }

            series.removePriceLine(item.priceLine)
            const newLine = series.createPriceLine(optionPriceLine)
            newPriceLines.push({ ...item, priceLine: newLine })
            return
          }
          if (item.state === 'down') {
            optionPriceLine = {
              ...optionPriceLine,
              color:
                optionPriceLine.price < barUpdated.close
                  ? '#f45353'
                  : '#53f463',
            }

            series.removePriceLine(item.priceLine)
            const newLine = series.createPriceLine(optionPriceLine)
            newPriceLines.push({ ...item, priceLine: newLine })
            return
          }
        })

        setPriceLines(newPriceLines)
        // series.setMarkers(newMarkers.map((item) => item.marker));
      }
    }
  }, [series, data, priceLines])

  // sửa phần tử cuối cùng
  const updateLastItemArray = (array, newItem) => {
    array.pop()
    array.push(newItem)
    return array
  }

  const betAdd = () => {
    const lastData = data[data.length - 1]
    const optionPriceLine = {
      price: lastData.close,
      color: 'transparent',
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.SparseDotted,
      axisLabelVisible: true,
      title: '@Up      ',
    }

    const line = series.createPriceLine(optionPriceLine)
    setPriceLines([...priceLines, { state: 'up', priceLine: line }])
  }

  const betDown = () => {
    const lastData = data[data.length - 1]
    const optionPriceLine = {
      price: lastData.close,
      color: '#d1d4dc',
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.SparseDotted,
      axisLabelVisible: true,
      title: '@Down',
    }

    const line = series.createPriceLine(optionPriceLine)
    setPriceLines([
      ...priceLines,
      { state: 'down', betTime: new Date().getTime(), priceLine: line },
    ])
  }

  const timeRemain = (betTime, rangeTime = 5) => {
    const r = betTime + rangeTime * 60 * 1000
    const now = new Date().getTime()

    return r - now
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
      <div
        style={{
          position: 'absolute',
          color: 'white',
          top: 12,
          right: 100,
          zIndex: 1,
        }}
      >
        Time Down:{' '}
      </div>
    </div>
  )
}

export default App
