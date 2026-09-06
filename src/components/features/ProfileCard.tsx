import { CheckCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Confirms, in one line, which resume the next run will start from.
 * Editing lives on the Profile page.
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
        <strong>Using your saved base resume</strong>
      </div>
      <button type="button" onClick={() => navigate(`/profile${reviewSuffix}`)}>Edit</button>
    </div>
  )
}
