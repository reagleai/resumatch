import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export function ProfileGuard() {
  const navigate = useNavigate()
  const location = useLocation()
  const reviewSuffix = import.meta.env.DEV && new URLSearchParams(location.search).get('review') === '1'
    ? '?review=1'
    : ''

  return (
    <div className="profile-guard" role="status">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <strong>Complete your profile first</strong>
        <span>Upload your base resume and confirm your name before generating.</span>
      </div>
      <button type="button" onClick={() => navigate(`/profile${reviewSuffix}`)}>
        Set up profile <ArrowRight size={15} aria-hidden="true" />
      </button>
    </div>
  )
}
