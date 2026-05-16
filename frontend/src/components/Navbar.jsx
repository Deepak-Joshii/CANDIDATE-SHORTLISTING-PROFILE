import { useNavigate } from 'react-router-dom'

function Navbar() {

  const navigate = useNavigate()

  const logout = () => {

    localStorage.removeItem('token')

    navigate('/')
  }

  return (
    <div className='navbar'>

      <h2>AI Candidate Shortlisting</h2>

      <button onClick={logout}>
        Logout
      </button>

    </div>
  )
}

export default Navbar