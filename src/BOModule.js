import React from 'react'
import { createChart } from 'lightweight-charts'

const t = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')
function BoModule() {
  const ref = React.useRef()

  const [series, setSeries] = React.useState(null)
  const [markers, setMarkers] = React.useState([])
  const [data, setData] = React.useState([])
  // const markers = [{ time: data[data.length - 48].time, position: "aboveBar", color: "#f68410", shape: "circle", text: "D" }];
  React.useEffect(() => {
    const chart = createChart(ref.current, {
      width: 1000,
      height: 500,
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
    seriesInit.setMarkers(markers)

    setSeries(seriesInit)

    // initial
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

        const newMarkers = []
        markers.forEach(item => {
          if (item.state === 'up') {
            newMarkers.push({
              ...item,
              marker: {
                ...item.marker,
                color: item.price > barUpdated.close ? '#f45353' : '#53f463',
              },
            })
            return
          }

          if (item.state === 'down') {
            newMarkers.push({
              ...item,
              marker: {
                ...item.marker,
                color: item.price < barUpdated.close ? '#f45353' : '#53f463',
              },
            })
            return
          }
          newMarkers.push(item)
        })

        setMarkers(newMarkers)
        series.setMarkers(newMarkers.map(item => item.marker))
      }
    }
  }, [series, data.length, markers])

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
      color: '#635e5e',
      shape: 'arrowDown',
      text: '@Up ' + lastData.close,
    }
    // lưu trạng thái marker
    const newMarkers = [
      ...markers,
      { state: 'up', price: lastData.close, marker },
    ]
    series.setMarkers(newMarkers.map(item => item.marker))
    setMarkers(newMarkers)
  }

  const betDown = () => {
    const lastData = data[data.length - 1]
    const marker = {
      time: lastData.time,
      position: 'belowBar',
      color: '#635e5e',
      shape: 'arrowUp',
      text: '@Down ' + lastData.close,
    }
    // lưu trạng thái marker
    const newMarkers = [
      ...markers,
      { state: 'down', price: lastData.close, marker },
    ]
    series.setMarkers(newMarkers.map(item => item.marker))
    setMarkers(newMarkers)
  }

  return (
    <div>
      <div ref={ref}></div>
      <button onClick={() => betAdd()}>Tăng</button>
      <button onClick={() => betDown()}>Giảm</button>
    </div>
  )
}

export default BoModule
