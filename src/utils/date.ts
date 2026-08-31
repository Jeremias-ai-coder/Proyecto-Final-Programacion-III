/**
 * Utilidades para manejo y comparación de fechas y horas de turnos.
 */

/**
 * Combina un campo Date y un campo Time en un objeto Date unificado en UTC.
 * Extrae año/mes/día de dateInput y hora/minutos de timeInput (independientemente
 * del año base que Prisma o MySQL usen para columnas TIME, ej: 1970).
 */
export function combineDateAndTime(dateInput: Date | string, timeInput: Date | string): Date {
  const d = new Date(dateInput);
  const t = new Date(timeInput);

  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('T')[0].split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    day = d.getUTCDate();
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (typeof timeInput === 'string' && timeInput.includes(':') && !timeInput.includes('T')) {
    const [h, m, s] = timeInput.split(':').map(Number);
    hours = h || 0;
    minutes = m || 0;
    seconds = s || 0;
  } else if (!isNaN(t.getTime())) {
    hours = t.getUTCHours();
    minutes = t.getUTCMinutes();
    seconds = t.getUTCSeconds();
  }

  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/**
 * Calcula la diferencia en horas entre el momento actual y el inicio del turno.
 * Un número negativo indica que el turno ya inició o transcurrió.
 */
export function getHoursUntilAppointment(dateInput: Date | string, timeInput: Date | string): number {
  const appointmentStart = combineDateAndTime(dateInput, timeInput);
  const now = new Date();
  const diffMs = appointmentStart.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Determina si el turno ya finalizó (hora de inicio + duración en minutos).
 */
export function isAppointmentPast(
  dateInput: Date | string,
  timeInput: Date | string,
  durationMinutes: number = 30
): boolean {
  const appointmentStart = combineDateAndTime(dateInput, timeInput);
  const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60 * 1000);
  return new Date() > appointmentEnd;
}

/**
 * Determina si transcurrió el período de tolerancia (2 horas tras la finalización del turno)
 * sin que el comercio lo haya marcado como completado.
 */
export function isPastGracePeriod(
  dateInput: Date | string,
  timeInput: Date | string,
  durationMinutes: number = 30,
  graceHours: number = 2
): boolean {
  const appointmentStart = combineDateAndTime(dateInput, timeInput);
  const expirationTime = new Date(
    appointmentStart.getTime() + (durationMinutes + graceHours * 60) * 60 * 1000
  );
  return new Date() > expirationTime;
}
