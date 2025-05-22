import React from "react";
import { Circuit } from "@/types";
import CircuitItem from "./CircuitItem";

interface CircuitListProps {
  circuits: Circuit[];
}

const CircuitList: React.FC<CircuitListProps> = ({ circuits }) => {
  if (!circuits.length) {
    return <div className="text-neutral-dark opacity-70 p-4">No circuits found.</div>;
  }
  return (
    <ul className="space-y-2">
      {circuits.map((circuit) => (
        <CircuitItem key={circuit.id} circuit={circuit} />
      ))}
    </ul>
  );
};

export default CircuitList; 