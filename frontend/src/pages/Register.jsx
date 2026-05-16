import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../services/api'

function Register() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
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
      const res = await API.post('/api/auth/register', formData)

      alert(res.data.message)

      navigate('/')

    } catch (err) {
      alert(err.response?.data?.error || 'Registration Failed')
    }
  }

  return (
    <div className='container'>
      <form className='form' onSubmit={handleSubmit}>
        <h2>Register</h2>

        <input
          type='text'
          name='name'
          placeholder='Enter Name'
          onChange={handleChange}
          required
        />

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

        <button type='submit'>Register</button>

        <p>
          Already have account? <Link to='/'>Login</Link>
        </p>
      </form>
    </div>
  )
}

export default Register