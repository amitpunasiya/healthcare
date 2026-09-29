import React from 'react';
import { ProviderManagementPage } from './ProviderManagementPage';

interface ServiceProvidersPageProps {
  categorySlug: string;
  title: string;
  subtitle: string;
}

export const ServiceProvidersPage: React.FC<ServiceProvidersPageProps> = ({ categorySlug, title, subtitle }) => {
  return (
    <ProviderManagementPage
      initialCategory={categorySlug}
      title={title}
      subtitle={subtitle}
    />
  );
};
