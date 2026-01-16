import EventForm from '../event-form';

export default function AddNew({ userData, eventId = null }) {
  return (
    <div className="section-box">
      <EventForm userData={userData} eventId={eventId} />
    </div>
  );
}
