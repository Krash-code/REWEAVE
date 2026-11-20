import { Check, CircleDot } from 'lucide-react';

function eventLabel(eventType) {
  return eventType.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Timeline({ events }) {
  if (!events.length) return <p className="timeline-empty">No history has been recorded yet.</p>;

  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li className="timeline-event" key={event._id}>
          <span className={`timeline-marker ${index === 0 ? 'is-first' : ''}`}>
            {index === 0 ? <Check size={13} /> : <CircleDot size={13} />}
          </span>
          <div className="timeline-content">
            <div className="timeline-event-heading">
              <strong>{eventLabel(event.eventType)}</strong>
              <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
            </div>
            {event.note && <p>{event.note}</p>}
            <span>Recorded by {event.actor?.name || 'REWEAVE member'}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}