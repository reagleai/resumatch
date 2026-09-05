import { CheckCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Compact profile-status banner shown on the Generator page.
 * Communicates that the profile is ready - no metadata details.
 * Profile editing is available via the sidebar/nav Profile page.
 */
export function ProfileCard() {
  const navigate = useNavigate()
  const location = useLocation()
  const reviewSuffix = import.meta.env.DEV && new URLSearchParams(location.search).get('review') === '1'
    ? '?review=1'
    : ''

  return (
    <div className="profile-status-card" role="status">
      <CheckCircle size={18} aria-hidden="true" />
      <div className="profile-status-copy">
        <strong>Profile ready</strong>
        <span>Your saved resume will be used for this run.</span>
      </div>
      <button type="button" onClick={() => navigate(`/profile${reviewSuffix}`)}>Edit</button>
    </div>
  )
}
