export const getDoctorTitle = (gender: string | null | undefined): string => {
  if (gender === 'masculino') return 'Dr.'
  if (gender === 'femenino') return 'Dra.'
  return 'Dr(a).'
}
