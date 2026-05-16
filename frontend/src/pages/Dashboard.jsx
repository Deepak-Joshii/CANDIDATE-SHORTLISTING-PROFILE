import { useEffect, useState } from 'react'
import API from '../services/api'
import Navbar from '../components/Navbar'

function Dashboard() {

  const [candidates, setCandidates] = useState([])

  const [search, setSearch] = useState('')

  const [aiResult, setAiResult] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    skills: '',
    experience: ''
  })

  const fetchCandidates = async () => {
    try {
      const res = await API.get('/api/candidates')

      setCandidates(res.data)

    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    fetchCandidates()
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await API.post('/api/candidates', {
        ...formData,
        skills: formData.skills.split(',')
      })

      alert('Candidate Added')

      setFormData({
        name: '',
        email: '',
        skills: '',
        experience: ''
      })

      fetchCandidates()

    } catch (err) {
      alert('Error Adding Candidate')
    }
  }

  const deleteCandidate = async (id) => {

    try {
      await API.delete(`/api/candidates/${id}`)

      alert('Deleted Successfully')

      fetchCandidates()

    } catch (err) {
      console.log(err)
    }
  }

  const searchCandidates = async () => {

    if (!search) {
      fetchCandidates()
      return
    }

    try {
      const res = await API.get(`/api/candidates/search/${search}`)

      setCandidates(res.data)

    } catch (err) {
      console.log(err)
    }
  }

  const aiShortlist = async () => {

    try {

      const res = await API.post('/api/ai/shortlist', {
        requiredSkills: ['React', 'MongoDB'],
        minExperience: 1
      })

      setAiResult(res.data.aiResult)

    } catch (err) {
      console.log(err)
    }
  }

  return (
    <>
      <Navbar />

      <div className='dashboard'>

        <div className='form-section'>
          <h2>Add Candidate</h2>

          <form onSubmit={handleSubmit}>

            <input
              type='text'
              name='name'
              placeholder='Candidate Name'
              value={formData.name}
              onChange={handleChange}
              required
            />

            <input
              type='email'
              name='email'
              placeholder='Candidate Email'
              value={formData.email}
              onChange={handleChange}
              required
            />

            <input
              type='text'
              name='skills'
              placeholder='Skills separated by comma'
              value={formData.skills}
              onChange={handleChange}
              required
            />

            <input
              type='number'
              name='experience'
              placeholder='Experience'
              value={formData.experience}
              onChange={handleChange}
              required
            />

            <button type='submit'>Add Candidate</button>
          </form>
        </div>

        <div className='search-box'>

          <input
            type='text'
            placeholder='Search By Skill'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button onClick={searchCandidates}>Search</button>

          <button onClick={fetchCandidates}>All</button>

          <button onClick={aiShortlist}>AI Shortlist</button>
        </div>

        {
          aiResult && (
            <div className='ai-box'>
              <h3>AI Result</h3>

              <pre>{aiResult}</pre>
            </div>
          )
        }

        <div className='candidate-grid'>

          {
            candidates.map((candidate) => (

              <div className='card' key={candidate._id}>

                <h3>{candidate.name}</h3>

                <p>
                  <strong>Email:</strong> {candidate.email}
                </p>

                <p>
                  <strong>Skills:</strong> {candidate.skills.join(', ')}
                </p>

                <p>
                  <strong>Experience:</strong> {candidate.experience} years
                </p>

                <button
                  onClick={() => deleteCandidate(candidate._id)}
                >
                  Delete
                </button>
              </div>
            ))
          }

        </div>
      </div>
    </>
  )
}

export default Dashboard