import { useState } from 'react'
import './App.css'
import { Input, Button, message } from 'antd'
import { trigger } from './handleCheck'

function App() {

  const [result, setResult] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const handleCheck = () => {
    try {
      if (start && end) {
        const value = trigger(+start, +end)
        setResult(value)
      }
      message.success(`Выполнено`)
    } catch (error: any) {
      message.error(`Ошибка: ${error.message}`)
    }
  }

  return (
    <div className="wrapper">
      <div className="content">
        <div className="title">RegEx checker</div>
        <div className="description">Введите диапазон чисел</div>
        <div className="inputs">
          <Input className='input' placeholder='Введите начало диапазона тут' value={start} onChange={(e) => setStart(e.target.value)}/>
          <Input className='input' placeholder='Введите конец диапазона тут' value={end} onChange={(e) => setEnd(e.target.value)}/>
        </div>
        <Button type='primary' onClick={handleCheck}>Вывести</Button>
        <p>result:</p>
        <div className="result">{result}</div>
      </div>
    </div>
  )
}

export default App
