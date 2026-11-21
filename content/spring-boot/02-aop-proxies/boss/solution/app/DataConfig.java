package app;

import javax.sql.DataSource;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

/** La base et son gestionnaire de transactions. Pas de @EnableTransactionManagement : c'est ton aspect qui travaille. Fourni. */
@Configuration
public class DataConfig {
    @Bean DataSource dataSource() { return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build(); }
    @Bean JdbcClient jdbcClient(DataSource ds) { return JdbcClient.create(ds); }
    @Bean DataSourceTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
}
