import AssessmentForm from '@/components/AssessmentForm'

// Immersive full-screen assessment — deliberately outside the (main) route
// group so it renders without the site Header/Footer.
export default function AssessmentPage() {
  return <AssessmentForm />
}
