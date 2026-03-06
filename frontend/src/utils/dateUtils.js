/**
 * Formats a Firestore timestamp or Unix millisecond into "h:mm AM/PM d MMM"
 * Example: 12:34 PM 7 June
 */
export const formatMotorTime = (timestamp) => {
    if (!timestamp) return 'Time unknown';

    let date;

    // Handle Firestore Timestamp { _seconds, _nanoseconds }
    if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
    } 
    // Handle Firestore Timestamp from some Firebase SDKs { seconds, nanoseconds }
    else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    }
    // Handle standard JS Date object or ISO string or Number
    else {
        date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return 'Invalid date';

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    const day = date.getDate();
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[date.getMonth()];

    return `${formattedHours}:${formattedMinutes} ${ampm} ${day} ${month}`;
};
