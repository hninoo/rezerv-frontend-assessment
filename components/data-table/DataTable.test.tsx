import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./DataTable.types";

type TestRow = {
  id: number;
  name: string;
};

const rows: TestRow[] = Array.from({ length: 60 }, (_, index) => ({
  id: index + 1,
  name: `Row ${index + 1}`
}));

const columns: ColumnDef<TestRow>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (row) => row.name
  }
];

function renderTable() {
  render(
    <DataTable
      ariaLabel="Test rows"
      columns={columns}
      defaultPageSize={5}
      getRowId={(row) => String(row.id)}
      rows={rows}
    />
  );
}

function pageInput() {
  return screen.getByLabelText("Go to page");
}

function goButton() {
  return screen.getByRole("button", { name: "Go" });
}

describe("DataTable pagination input", () => {
  it("keeps the page input synced with jump, pager, clamp, and page-size changes", () => {
    renderTable();

    expect(pageInput()).toHaveValue(1);
    expect(screen.getByText("Row 1")).toBeInTheDocument();

    fireEvent.change(pageInput(), { target: { value: "5" } });
    fireEvent.click(goButton());

    expect(pageInput()).toHaveValue(5);
    expect(screen.getByText("Row 21")).toBeInTheDocument();

    fireEvent.change(pageInput(), { target: { value: "6" } });
    fireEvent.click(goButton());

    expect(pageInput()).toHaveValue(6);
    expect(screen.getByText("Row 26")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(pageInput()).toHaveValue(7);
    expect(screen.getByText("Row 31")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(pageInput()).toHaveValue(6);
    expect(screen.getByText("Row 26")).toBeInTheDocument();

    fireEvent.change(pageInput(), { target: { value: "99" } });
    fireEvent.click(goButton());

    expect(pageInput()).toHaveValue(12);
    expect(screen.getByText("Row 56")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rows"), { target: { value: "10" } });

    expect(pageInput()).toHaveValue(1);
    expect(screen.getByText("Row 1")).toBeInTheDocument();
  });
});
