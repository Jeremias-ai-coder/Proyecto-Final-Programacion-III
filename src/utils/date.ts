/**
 * Utilidades para manejo y comparación de fechas y horas de turnos.
 */

/**
 * Convierte un input de hora (string "HH:mm", "HH:mm:ss", ISO Date string o Date)
 * a un Date UTC estándar con fecha base 1970-01-01T...
 */
export function parseTimeToUTC(timeInput: string | Date): Date {
  if (timeInput instanceof Date) {
    if (isNaN(timeInput.getTime())) return new Date('1970-01-01T00:00:00.000Z');
    const h = String(timeInput.getUTCHours()).padStart(2, '0');
    const m = String(timeInput.getUTCMinutes()).padStart(2, '0');
    return new Date(`1970-01-01T${h}:${m}:00.000Z`);
  }

  const str = String(timeInput).trim();
  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    const match = timePart.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      return new Date(`1970-01-01T${h}:${m}:00.000Z`);
    }
  }

  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2];
    return new Date(`1970-01-01T${h}:${m}:00.000Z`);
  }

  return new Date(timeInput);
}

/**
 * Combina un campo Date y un campo Time en un objeto Date unificado en UTC.
 * Extrae año/mes/día de dateInput y hora/minutos de timeInput de forma determinista.
 */
export function combineDateAndTime(dateInput: Date | string, timeInput: Date | string): Date {
  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('T')[0].split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    const d = new Date(dateInput);
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    day = d.getUTCDate();
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (typeof timeInput === 'string') {
    const str = timeInput.trim();
    if (str.includes('T')) {
      const timePart = str.split('T')[1];
      const match = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        hours = Number(match[1]);
        minutes = Number(match[2]);
        seconds = Number(match[3] || 0);
      }
    } else {
      const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        hours = Number(match[1]);
        minutes = Number(match[2]);
        seconds = Number(match[3] || 0);
      }
    }
  } else if (timeInput instanceof Date && !isNaN(timeInput.getTime())) {
    hours = timeInput.getUTCHours();
    minutes = timeInput.getUTCMinutes();
    seconds = timeInput.getUTCSeconds();
  }

  return new Date(year, month, day, hours, minutes, seconds);
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
