import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../services/api'

function Login() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const res = await API.post('/api/auth/login', formData)

      localStorage.setItem('token', res.data.token)

      alert('Login Successful')

      navigate('/dashboard')

    } catch (err) {
      alert(err.response?.data?.error || 'Login Failed')
    }
  }

  return (
    <div className='container'>
      <form className='form' onSubmit={handleSubmit}>
        <h2>Login</h2>

        <input
          type='email'
          name='email'
          placeholder='Enter Email'
          onChange={handleChange}
          required
        />

        <input
          type='password'
          name='password'
          placeholder='Enter Password'
          onChange={handleChange}
          required
        />

        <button type='submit'>Login</button>

        <p>
          New user? <Link to='/register'>Register</Link>
        </p>
      </form>
    </div>
  )
}

export default Login