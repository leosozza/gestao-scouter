import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

export const columns = (
  setSelectedFichas: (fichas: Set<string>) => void,
  selectedFichas: Set<string>,
  handleUpdateFichaPaga: (fichaIds: string[], status: 'Sim' | 'Não') => Promise<void>
): ColumnDef<any>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Selecionar linha"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "ID",
    header: "ID",
  },
  {
    accessorKey: "Gestão de Scouter",
    header: "Scouter",
  },
  {
    accessorKey: "Projetos Cormeciais",
    header: "Projeto",
  },
  {
    accessorKey: "Data de criação da Ficha",
    header: "Data",
  },
  {
    accessorKey: "Ficha paga",
    header: "Status Pagamento",
  },
];