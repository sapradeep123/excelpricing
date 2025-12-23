import { Server, Database, Layers, Shield } from "lucide-react";

export const TECH_TOOLTIPS: Record<string, string> = {
  "vCPU": "Virtual CPU - A portion of a physical CPU core assigned to your virtual machine",
  "RAM": "Random Access Memory - Temporary storage for running applications. More RAM = better multitasking",
  "IOPS": "Input/Output Operations Per Second - Measures storage speed. Higher IOPS = faster disk performance",
  "HA": "High Availability - Redundant setup that keeps your services running if one server fails",
  "VPC": "Virtual Private Cloud - Your own isolated private network in the cloud",
  "Elastic IP": "A static public IP address that stays the same even if you restart your server",
  "Load Balancer": "Distributes traffic across multiple servers to improve performance and reliability",
  "Block Storage": "High-performance disk storage that can be attached to virtual machines",
  "Object Storage": "Scalable storage for files, images, and backups accessible via API",
  "Worker Node": "A server in your Kubernetes cluster that runs your applications",
  "Retention": "How long backup copies are kept before being automatically deleted",
};

export const SERVICE_CATALOG = [
  {
    id: "vm",
    name: "Virtual Machine",
    description: "Deploy scalable virtual machines with flexible compute, storage, and networking options.",
    icon: Server,
  },
  {
    id: "object-storage",
    name: "Object Storage",
    description: "S3-compatible object storage for files, backups, and static assets.",
    icon: Database,
  },
  {
    id: "kubernetes",
    name: "Kubernetes Cluster",
    description: "Managed Kubernetes clusters with autoscaling worker nodes and high availability.",
    icon: Layers,
  },
  {
    id: "veeam",
    name: "Veeam Backup",
    description: "Enterprise backup and disaster recovery solution for your infrastructure.",
    icon: Shield,
  },
];
