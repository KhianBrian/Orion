import { useState } from "react";
import { AppointmentCard } from "./AppointmentCard";

function isUpcoming(appointment, now) {
  return appointment.status === "booked" && new Date(appointment.ends_at).getTime() >= new Date(now).getTime();
}

export function AppointmentList({ appointments, isPatient, now, onCancel }) {
  const [activeTab, setActiveTab] = useState("upcoming");
  const upcoming = appointments.filter((appointment) => isUpcoming(appointment, now));
  const history = appointments.filter((appointment) => !isUpcoming(appointment, now));
  const tabs = [
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "history", label: "History", count: history.length },
  ];

  return <section aria-label="Appointments" className="appointment-list">
    <div className="appointment-tabs" role="tablist" aria-label="Appointment views">
      {tabs.map((tab) => <button key={tab.id} type="button" role="tab" id={`${tab.id}-appointments-tab`} aria-selected={activeTab === tab.id} aria-controls={`${tab.id}-appointments-panel`} className="appointment-tabs__tab" onClick={() => setActiveTab(tab.id)}>
        {tab.label}<span className="appointment-tabs__count" aria-label={`${tab.count} appointments`}>{tab.count}</span>
      </button>)}
    </div>
    <section role="tabpanel" id={`${activeTab}-appointments-panel`} aria-labelledby={`${activeTab}-appointments-tab`} aria-label={activeTab === "upcoming" ? "Upcoming appointments" : "Appointment history"}>
      <h2>{activeTab === "upcoming" ? "Upcoming appointments" : "Appointment history"}</h2>
      {activeTab === "upcoming" && (upcoming.length ? <div className="appointment-list__grid">{upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} isPatient={isPatient} isUpcoming now={now} onCancel={onCancel} />)}</div> : <p className="appointment-list__empty">No upcoming appointments.</p>)}
      {activeTab === "history" && (history.length ? <div className="appointment-list__grid">{history.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} isPatient={isPatient} isUpcoming={false} now={now} onCancel={onCancel} />)}</div> : <p className="appointment-list__empty">No appointment history yet.</p>)}
    </section>
  </section>;
}
